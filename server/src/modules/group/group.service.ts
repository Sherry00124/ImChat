import { Injectable } from '@nestjs/common'
import { Repository, Like, getRepository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Group, GroupMap } from './entity/group.entity'
import { GroupMessage } from './entity/groupMessage.entity'
import { RCode } from 'src/common/constant/rcode'
import { User } from '../user/entity/user.entity'
import { defaultGroupMessageTime } from 'src/common/constant/global'

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMap)
    private readonly groupUserRepository: Repository<GroupMap>
  ) {}

  async postGroups(groupIds: string) {
    try {
      if (groupIds) {
        const groupIdArr = groupIds.split(',')
        const groupArr = []
        for (const groupId of groupIdArr) {
          const data = await this.groupRepository.findOne({ groupId: groupId })
          groupArr.push(data)
        }
        return { msg: 'Get group information successfully', data: groupArr }
      }
      return {
        code: RCode.FAIL,
        msg: 'Failed to get group information',
        data: null
      }
    } catch (e) {
      return { code: RCode.ERROR, msg: 'Failed to get group', data: e }
    }
  }

  async getUserGroups(userId: string) {
    try {
      let data
      if (userId) {
        data = await this.groupUserRepository.find({ userId: userId })
        return { msg: 'Get all group successes for a user', data }
      }
      data = await this.groupUserRepository.find()
      return { msg: 'Get all groups in the system successfully', data }
    } catch (e) {
      return { code: RCode.ERROR, msg: `Failed to get user's group`, data: e }
    }
  }

  async getGroupMessages(
    userId: string,
    groupId: string,
    current: number,
    pageSize: number
  ) {
    const groupUser = await this.groupUserRepository.findOne({
      userId,
      groupId
    })
    const { createTime } = groupUser
    let groupMessage = await getRepository(GroupMessage)
      .createQueryBuilder('groupMessage')
      .orderBy('groupMessage.time', 'DESC')
      .where('groupMessage.groupId = :id', { id: groupId })
      .andWhere('groupMessage.time >= :createTime', {
        createTime: createTime - defaultGroupMessageTime // 新用户进群默认可以看群近24小时消息
      })
      .skip(current)
      .take(pageSize)
      .getMany()
    groupMessage = groupMessage.reverse()

    const userGather: { [key: string]: User } = {}
    let userArr: FriendDto[] = []
    for (const message of groupMessage) {
      if (!userGather[message.userId]) {
        userGather[message.userId] = await getRepository(User)
          .createQueryBuilder('user')
          .where('user.userId = :id', { id: message.userId })
          .getOne()
      }
    }
    userArr = Object.values(userGather)
    return { msg: '', data: { messageArr: groupMessage, userArr: userArr } }
  }

  async getGroupsByName(groupName: string) {
    try {
      if (groupName) {
        const groups = await this.groupRepository.find({
          groupName: Like(`%${groupName}%`)
        })
        return { data: groups }
      }
      return {
        code: RCode.FAIL,
        msg: 'Please enter the group nickname',
        data: null
      }
    } catch (e) {
      return { code: RCode.ERROR, msg: 'Finding Group Errors', data: null }
    }
  }

  async update(group: GroupDto) {
    try {
      await this.groupRepository.update(group.groupId, group)
      return {
        code: RCode.OK,
        msg: 'Modified successfully',
        data: group
      }
    } catch (e) {
      return { code: RCode.ERROR, msg: 'Update failure', data: null }
    }
  }
}
