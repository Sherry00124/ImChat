import { Injectable } from '@nestjs/common'
import { Repository, Like } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { User } from './entity/user.entity'
import { Group, GroupMap } from '../group/entity/group.entity'
import { createWriteStream } from 'fs'
import { join } from 'path'
import { RCode } from 'src/common/constant/rcode'
import { GroupMessage } from '../group/entity/groupMessage.entity'
import { UserMap } from '../friend/entity/friend.entity'
import { FriendMessage } from '../friend/entity/friendMessage.entity'
import { md5 } from 'src/common/tool/utils'
import { AuthService } from './../auth/auth.service'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMap)
    private readonly groupUserRepository: Repository<GroupMap>,
    @InjectRepository(GroupMessage)
    private readonly groupMessageRepository: Repository<GroupMessage>,
    @InjectRepository(UserMap)
    private readonly friendRepository: Repository<UserMap>,
    @InjectRepository(FriendMessage)
    private readonly friendMessageRepository: Repository<FriendMessage>,
    private readonly authService: AuthService
  ) {}

  async getUser(userId: string) {
    try {
      let data
      if (userId) {
        data = await this.userRepository.findOne({
          where: { userId: userId }
        })
        return { msg: 'Get User Success', data }
      }
    } catch (e) {
      return { code: RCode.ERROR, msg: 'Failed to get user', data: e }
    }
  }

  async postUsers(userIds: string) {
    try {
      if (userIds) {
        const userIdArr = userIds.split(',')
        const userArr = []
        for (const userId of userIdArr) {
          if (userId) {
            const data = await this.userRepository.findOne({
              where: { userId: userId }
            })
            userArr.push(data)
          }
        }
        return { msg: 'Get user information successfully', data: userArr }
      }
      return {
        code: RCode.FAIL,
        msg: 'Failed to get user information',
        data: null
      }
    } catch (e) {
      return {
        code: RCode.ERROR,
        msg: 'Failed to get user information',
        data: e
      }
    }
  }

  async updateUserName(oldUser: User, username: string) {
    try {
      if (oldUser) {
        const isHaveName = await this.userRepository.findOne({
          username
        })
        if (isHaveName) {
          return { code: 1, msg: 'Duplicate user name', data: '' }
        }
        const newUser = await this.userRepository.findOne({
          userId: oldUser.userId
        })
        newUser.username = username
        await this.userRepository.update(oldUser.userId, newUser)
        return { msg: 'Updated username successfully', data: newUser }
      }
      return { code: RCode.FAIL, msg: 'Update failure', data: '' }
    } catch (e) {
      return { code: RCode.ERROR, msg: 'Failed to update username', data: e }
    }
  }

  async updatePassword(user: User, password: string) {
    try {
      if (user) {
        const newUser = await this.userRepository.findOne({
          userId: user.userId
        })
        const backUser = JSON.parse(JSON.stringify(newUser))
        newUser.password = md5(password)
        await this.userRepository.update(user.userId, newUser)
        return { msg: 'Update user password successfully', data: backUser }
      }
      return { code: RCode.FAIL, msg: 'Update failure', data: '' }
    } catch (e) {
      return {
        code: RCode.ERROR,
        msg: 'Failed to update user password',
        data: e
      }
    }
  }

  async delUser(user: User, did: string) {
    try {
      if (user.role === 'admin') {
        // 被删用户自己创建的群
        const groups = await this.groupRepository.find({ userId: did })
        for (const group of groups) {
          await this.groupRepository.delete({ groupId: group.groupId })
          await this.groupUserRepository.delete({ groupId: group.groupId })
          await this.groupMessageRepository.delete({ groupId: group.groupId })
        }
        // 被删用户加入的群
        await this.groupUserRepository.delete({ userId: did })
        await this.groupMessageRepository.delete({ userId: did })
        // 被删用户好友
        await this.friendRepository.delete({ userId: did })
        await this.friendRepository.delete({ friendId: did })
        await this.friendMessageRepository.delete({ userId: did })
        await this.friendMessageRepository.delete({ friendId: did })
        await this.userRepository.delete({ userId: did })
        return { msg: 'User deleted successfully' }
      }
      return { code: RCode.FAIL, msg: 'User Deletion Failed' }
    } catch (e) {
      return { code: RCode.ERROR, msg: 'User Deletion Failed', data: e }
    }
  }

  async getUsersByName(username: string) {
    try {
      if (username) {
        const users = await this.userRepository.find({
          where: { username: Like(`%${username}%`) }
        })
        return { data: users }
      }
      return {
        code: RCode.FAIL,
        msg: 'Please enter your user name',
        data: null
      }
    } catch (e) {
      return { code: RCode.ERROR, msg: 'Finding User Errors', data: null }
    }
  }

  async setUserAvatar(user: User, file) {
    const newUser = await this.userRepository.findOne({
      userId: user.userId
    })
    if (newUser) {
      const random = Date.now() + '&'
      const stream = createWriteStream(
        join('public/avatar', random + file.originalname)
      )
      stream.write(file.buffer)
      newUser.avatar = `/avatar/${random}${file.originalname}`
      await this.userRepository.save(newUser)
      return { msg: 'Changed avatar successfully', data: newUser }
    } else {
      return { code: RCode.FAIL, msg: 'Failed to change avatar' }
    }
  }
}
