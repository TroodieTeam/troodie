# TRO-126: Fix Post Like Counter
# Feature: Post Like Counter Updates Instantly
# 
# As a user
# I want to see accurate like counts that update instantly when I like/unlike posts
# So that I can trust the engagement metrics I see

Feature: Post Like Counter Instant Updates

  Background:
    Given I am logged in as a user
    And I am viewing a post card with a heart icon
    And the post has a like count displayed

  Scenario: Like a post and see count increment instantly
    Given the post is not currently liked by me
    And the current like count is "0"
    When I tap the heart icon
    Then the heart icon should turn red immediately
    And the like count should show "1" instantly
    And the like count should remain "1" after the server response

  Scenario: Unlike a post and see count decrement instantly
    Given the post is currently liked by me
    And the current like count is "5"
    When I tap the heart icon
    Then the heart icon should turn white/outline immediately
    And the like count should show "4" instantly
    And the like count should remain "4" after the server response

  Scenario: Like count persists even if server response is delayed
    Given the post is not currently liked by me
    And the current like count is "0"
    When I tap the heart icon
    Then the heart icon should turn red immediately
    And the like count should show "1" instantly
    When the server response is delayed or returns stale data
    Then the like count should remain "1" (not revert to "0")
    And the heart icon should remain red

  Scenario: Like count updates correctly with concurrent likes
    Given the post is not currently liked by me
    And the current like count is "3"
    When I tap the heart icon
    Then the heart icon should turn red immediately
    And the like count should show "4" instantly
    When another user also likes the post simultaneously
    And the server response returns a count of "5"
    Then the like count should update to "5" (reflecting concurrent likes)
    And the heart icon should remain red

  Scenario: Unlike count persists even if server response is delayed
    Given the post is currently liked by me
    And the current like count is "10"
    When I tap the heart icon
    Then the heart icon should turn white/outline immediately
    And the like count should show "9" instantly
    When the server response is delayed or returns stale data
    Then the like count should remain "9" (not revert to "10")
    And the heart icon should remain white/outline

  Scenario: Error handling - revert on failure
    Given the post is not currently liked by me
    And the current like count is "2"
    When I tap the heart icon
    Then the heart icon should turn red immediately
    And the like count should show "3" instantly
    When the server request fails
    Then the heart icon should revert to white/outline
    And the like count should revert to "2"
    And an error message should be displayed

  Scenario Outline: Like counter works across different post card types
    Given I am viewing a post in a "<card_type>" component
    And the post is not currently liked by me
    And the current like count is "<initial_count>"
    When I tap the heart icon
    Then the heart icon should turn red immediately
    And the like count should show "<expected_count>" instantly

    Examples:
      | card_type           | initial_count | expected_count |
      | PostCard            | 0             | 1              |
      | PostCard            | 5             | 6              |
      | EnhancedPostCard    | 0             | 1              |
      | EnhancedPostCard    | 10            | 11             |
      | ExplorePostCard    | 0             | 1              |
      | ProfilePostCard    | 0             | 1              |

  Scenario: Multiple rapid likes/unlikes
    Given the post is not currently liked by me
    And the current like count is "0"
    When I tap the heart icon rapidly 3 times
    Then the heart icon should reflect the final state (liked/unliked)
    And the like count should show the correct final count
    And there should be no flickering or inconsistent states

