export type UserMapping = {
  bmoniUserId: string;
  createdAt: string;
  email: string;
  localUserId: string;
  updatedAt: string;
};

export interface UserMappingRepository {
  findByEmail(email: string): Promise<UserMapping | null>;
  findByLocalUserId(localUserId: string): Promise<UserMapping | null>;
  save(mapping: UserMapping): Promise<UserMapping>;
  close(): Promise<void>;
}
