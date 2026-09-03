export type UserMapping = {
  bmoniUserId: string;
  createdAt: string;
  email: string;
  localUserId: string;
  updatedAt: string;
};

export interface UserMappingRepository {
  findByEmail(email: string): UserMapping | null;
  findByLocalUserId(localUserId: string): UserMapping | null;
  save(mapping: UserMapping): UserMapping;
}
