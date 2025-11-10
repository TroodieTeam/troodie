import { faker } from '@faker-js/faker'

export const mockUser = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  username: faker.internet.userName().toLowerCase(),
  email: faker.internet.email(),
  display_name: faker.person.fullName(),
  avatar_url: faker.image.avatar(),
  bio: faker.lorem.sentence(),
  account_type: 'consumer' as const,
  is_verified: false,
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
})

export const mockRestaurant = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  name: faker.company.name() + ' Restaurant',
  city: 'Charlotte',
  state: 'NC',
  address: faker.location.streetAddress(),
  google_rating: faker.number.float({ min: 3.5, max: 5, fractionDigits: 1 }),
  google_place_id: faker.string.alphanumeric(27),
  cuisine_type: faker.helpers.arrayElement(['Italian', 'Mexican', 'Asian', 'American']),
  price_level: faker.helpers.arrayElement(['$', '$$', '$$$', '$$$$']),
  created_at: faker.date.past().toISOString(),
  ...overrides,
})

export const mockPost = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  content: faker.lorem.paragraph(),
  post_type: 'review' as const,
  restaurant_id: faker.string.uuid(),
  created_at: faker.date.recent().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
})

export const mockBoard = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  name: faker.lorem.words(3),
  description: faker.lorem.sentence(),
  owner_id: faker.string.uuid(),
  type: 'free' as const,
  is_public: true,
  created_at: faker.date.past().toISOString(),
  ...overrides,
})

export const mockCommunity = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  name: faker.lorem.words(2),
  description: faker.lorem.sentence(),
  admin_id: faker.string.uuid(),
  type: 'public' as const,
  member_count: faker.number.int({ min: 10, max: 1000 }),
  created_at: faker.date.past().toISOString(),
  ...overrides,
})

export const mockNotification = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  type: 'like' as const,
  title: faker.lorem.sentence(),
  message: faker.lorem.sentence(),
  read: false,
  created_at: faker.date.recent().toISOString(),
  ...overrides,
})

export const mockComment = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  post_id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  content: faker.lorem.paragraph(),
  created_at: faker.date.recent().toISOString(),
  ...overrides,
})

export const mockSave = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  restaurant_id: faker.string.uuid(),
  board_id: faker.string.uuid(),
  personal_rating: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
  notes: faker.lorem.sentence(),
  created_at: faker.date.recent().toISOString(),
  ...overrides,
})

export const mockBoardInvitation = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  board_id: faker.string.uuid(),
  inviter_id: faker.string.uuid(),
  invitee_id: faker.string.uuid(),
  status: 'pending' as const,
  created_at: faker.date.recent().toISOString(),
  ...overrides,
})
