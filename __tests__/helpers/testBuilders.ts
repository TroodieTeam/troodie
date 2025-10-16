import { mockUser, mockRestaurant, mockPost, mockBoard, mockCommunity } from './mockFactories'

export class UserBuilder {
  private user: any

  constructor() {
    this.user = mockUser()
  }

  withId(id: string) {
    this.user.id = id
    return this
  }

  withUsername(username: string) {
    this.user.username = username
    return this
  }

  withEmail(email: string) {
    this.user.email = email
    return this
  }

  withAccountType(type: 'consumer' | 'creator' | 'business') {
    this.user.account_type = type
    return this
  }

  verified() {
    this.user.is_verified = true
    return this
  }

  asConsumer() {
    this.user.account_type = 'consumer'
    return this
  }

  asCreator() {
    this.user.account_type = 'creator'
    this.user.is_verified = true
    return this
  }

  asBusiness() {
    this.user.account_type = 'business'
    this.user.is_verified = true
    return this
  }

  build() {
    return this.user
  }
}

export class RestaurantBuilder {
  private restaurant: any

  constructor() {
    this.restaurant = mockRestaurant()
  }

  withId(id: string) {
    this.restaurant.id = id
    return this
  }

  withName(name: string) {
    this.restaurant.name = name
    return this
  }

  inCity(city: string, state: string = 'NC') {
    this.restaurant.city = city
    this.restaurant.state = state
    return this
  }

  withRating(rating: number) {
    this.restaurant.google_rating = rating
    return this
  }

  withCuisine(cuisine: string) {
    this.restaurant.cuisine_type = cuisine
    return this
  }

  withPriceLevel(price: string) {
    this.restaurant.price_level = price
    return this
  }

  build() {
    return this.restaurant
  }
}

export class PostBuilder {
  private post: any

  constructor() {
    this.post = mockPost()
  }

  withId(id: string) {
    this.post.id = id
    return this
  }

  byUser(userId: string) {
    this.post.user_id = userId
    return this
  }

  forRestaurant(restaurantId: string) {
    this.post.restaurant_id = restaurantId
    this.post.post_type = 'review'
    return this
  }

  withContent(content: string) {
    this.post.content = content
    return this
  }

  asSimplePost() {
    this.post.post_type = 'simple'
    this.post.restaurant_id = null
    return this
  }

  asExternalContent() {
    this.post.post_type = 'external'
    return this
  }

  build() {
    return this.post
  }
}

export class BoardBuilder {
  private board: any

  constructor() {
    this.board = mockBoard()
  }

  withId(id: string) {
    this.board.id = id
    return this
  }

  ownedBy(userId: string) {
    this.board.owner_id = userId
    return this
  }

  named(name: string) {
    this.board.name = name
    return this
  }

  withDescription(description: string) {
    this.board.description = description
    return this
  }

  asPrivate() {
    this.board.type = 'private'
    this.board.is_public = false
    return this
  }

  asPaid() {
    this.board.type = 'paid'
    return this
  }

  asPublic() {
    this.board.type = 'free'
    this.board.is_public = true
    return this
  }

  build() {
    return this.board
  }
}

export class CommunityBuilder {
  private community: any

  constructor() {
    this.community = mockCommunity()
  }

  withId(id: string) {
    this.community.id = id
    return this
  }

  ownedBy(adminId: string) {
    this.community.admin_id = adminId
    return this
  }

  named(name: string) {
    this.community.name = name
    return this
  }

  withDescription(description: string) {
    this.community.description = description
    return this
  }

  asPrivate() {
    this.community.type = 'private'
    return this
  }

  asPublic() {
    this.community.type = 'public'
    return this
  }

  asPaid() {
    this.community.type = 'paid'
    return this
  }

  withMemberCount(count: number) {
    this.community.member_count = count
    return this
  }

  build() {
    return this.community
  }
}
