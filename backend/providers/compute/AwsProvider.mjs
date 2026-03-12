import {
  EC2Client,
  DescribeInstancesCommand,
  RunInstancesCommand,
  TerminateInstancesCommand,
  StartInstancesCommand,
  StopInstancesCommand,
  RebootInstancesCommand,
  DescribeAddressesCommand,
  AllocateAddressCommand,
  AssociateAddressCommand,
  ReleaseAddressCommand,
  DescribeImagesCommand,
  AuthorizeSecurityGroupIngressCommand,
  DescribeKeyPairsCommand
} from '@aws-sdk/client-ec2'
import BaseComputeProvider from './BaseComputeProvider.mjs'

export default class AwsProvider extends BaseComputeProvider {
  static providerName = 'aws'
  static capabilities = ['elastic_ip', 'switch_ip', 'security_groups', 'allow_all_inbound_traffic']

  constructor(account) {
    super(account)
    const { accessKeyId, secretAccessKey, region = 'ap-southeast-1' } = account.credentials || {}
    this.client = new EC2Client({
      region,
      credentials: { accessKeyId, secretAccessKey }
    })
    this.region = region
  }

  async listInstances() {
    const data = await this.client.send(new DescribeInstancesCommand({}))
    return data.Reservations.flatMap(r =>
      r.Instances.map(i => AwsProvider.normalizeInstance(i, this.region))
    )
  }

  async getInstance(instanceId) {
    const data = await this.client.send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }))
    const ins = data.Reservations?.[0]?.Instances?.[0]
    if (!ins) throw new Error('实例不存在: ' + instanceId)
    return AwsProvider.normalizeInstance(ins, this.region)
  }

  async createInstance(params) {
    const { instanceType = 't2.micro', imageId, rootPassword = 'Admin@123@q' } = params

    let finalImageId = imageId
    if (!finalImageId) {
      const imgCmd = new DescribeImagesCommand({
        Owners: ['amazon'],
        Filters: [
          { Name: 'name', Values: ['amzn2-ami-hvm-*-x86_64-gp2'] },
          { Name: 'state', Values: ['available'] }
        ]
      })
      const imgRes = await this.client.send(imgCmd)
      const sorted = imgRes.Images.sort((a, b) => new Date(b.CreationDate) - new Date(a.CreationDate))
      if (!sorted.length) throw new Error('未找到可用 AMI')
      finalImageId = sorted[0].ImageId
    }

    const userDataScript = `#!/bin/bash\necho "ec2-user:${rootPassword}" | chpasswd\nsed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config\nsystemctl restart sshd`

    const res = await this.client.send(new RunInstancesCommand({
      ImageId: finalImageId,
      InstanceType: instanceType,
      UserData: Buffer.from(userDataScript).toString('base64'),
      MinCount: 1, MaxCount: 1
    }))

    const ins = res.Instances[0]
    return { instanceId: ins.InstanceId, displayName: ins.InstanceId }
  }

  async deleteInstance(instanceId) {
    await this.client.send(new TerminateInstancesCommand({ InstanceIds: [instanceId] }))
    return { instanceId }
  }

  async instanceAction(instanceId, action) {
    switch (action) {
      case 'START':
        await this.client.send(new StartInstancesCommand({ InstanceIds: [instanceId] }))
        break
      case 'STOP':
        await this.client.send(new StopInstancesCommand({ InstanceIds: [instanceId] }))
        break
      case 'REBOOT':
      case 'HARD_REBOOT':
        await this.client.send(new RebootInstancesCommand({ InstanceIds: [instanceId] }))
        break
      default:
        throw new Error('不支持的操作: ' + action)
    }
    return { instanceId, action }
  }

  async switchPublicIp(instanceId, dnsRecord) {
    // Find the current elastic IP associated to the instance
    const addrs = await this.client.send(new DescribeAddressesCommand({}))
    const oldAddr = addrs.Addresses.find(a => a.InstanceId === instanceId)

    // Allocate new
    const alloc = await this.client.send(new AllocateAddressCommand({ Domain: 'vpc' }))
    const newAllocationId = alloc.AllocationId
    const newPublicIp = alloc.PublicIp

    // Associate
    await this.client.send(new AssociateAddressCommand({ InstanceId: instanceId, AllocationId: newAllocationId }))

    // Release old
    if (oldAddr?.AllocationId) {
      await this.client.send(new ReleaseAddressCommand({ AllocationId: oldAddr.AllocationId }))
    }

    return { newIp: newPublicIp, oldIp: oldAddr?.PublicIp || null }
  }

  async listElasticIps() {
    const data = await this.client.send(new DescribeAddressesCommand({}))
    return data.Addresses.map(a => ({
      allocationId: a.AllocationId,
      publicIp: a.PublicIp,
      instanceId: a.InstanceId || null,
      associated: !!a.InstanceId
    }))
  }

  async releaseUnusedElasticIps() {
    const data = await this.client.send(new DescribeAddressesCommand({}))
    const unassociated = data.Addresses.filter(a => !a.InstanceId)
    const results = []
    for (const ip of unassociated) {
      try {
        await this.client.send(new ReleaseAddressCommand({ AllocationId: ip.AllocationId }))
        results.push({ ip: ip.PublicIp, success: true })
      } catch (e) {
        results.push({ ip: ip.PublicIp, success: false, error: e.message })
      }
    }
    return results
  }

  async allowAllInboundTraffic(instanceId) {
    const data = await this.client.send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }))
    const ins = data.Reservations?.[0]?.Instances?.[0]
    if (!ins) throw new Error('实例不存在: ' + instanceId)
    const sgIds = ins.SecurityGroups?.map(sg => sg.GroupId) || []

    for (const groupId of sgIds) {
      try {
        await this.client.send(new AuthorizeSecurityGroupIngressCommand({
          GroupId: groupId,
          IpPermissions: [{ IpProtocol: '-1', IpRanges: [{ CidrIp: '0.0.0.0/0' }], Ipv6Ranges: [{ CidrIpv6: '::/0' }] }]
        }))
      } catch (err) {
        if (!err.message.includes('already exists') && err.name !== 'InvalidPermission.Duplicate') {
          throw err
        }
      }
    }
    return { success: true }
  }

  static normalizeInstance(raw, region) {
    return {
      id: raw.InstanceId,
      displayName: raw.Tags?.find(t => t.Key === 'Name')?.Value || raw.InstanceId,
      state: raw.State?.Name?.toUpperCase() || 'UNKNOWN',
      publicIps: raw.PublicIpAddress ? [raw.PublicIpAddress] : [],
      privateIps: raw.PrivateIpAddress ? [raw.PrivateIpAddress] : [],
      ipv6Addresses: [],
      region,
      zone: raw.Placement?.AvailabilityZone || region,
      shape: raw.InstanceType,
      cpu: null,
      memoryGb: null,
      provider: 'aws',
      timeCreated: raw.LaunchTime,
      tags: (raw.Tags || []).reduce((acc, t) => { acc[t.Key] = t.Value; return acc }, {}),
      raw
    }
  }
}
