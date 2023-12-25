import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class Group {
  @PrimaryGeneratedColumn('uuid')
  groupId: string

  @Column()
  userId: string

  @Column()
  groupName: string

  @Column({ default: 'No announcement at this time' })
  notice: string

  @Column({ type: 'double', default: new Date().valueOf() })
  createTime: number
}

@Entity()
export class GroupMap {
  @PrimaryGeneratedColumn()
  _id: number

  @Column()
  groupId: string

  @Column()
  userId: string

  @Column({
    type: 'double',
    default: new Date().valueOf(),
    comment: 'Admission time'
  })
  createTime: number
}
