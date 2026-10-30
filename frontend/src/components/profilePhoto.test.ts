import { describe, expect, it } from 'vitest'
import { avatarKeyFor } from './profilePhoto'

const tokenFor = (payload: object) =>
  `header.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.signature`

describe('avatarKeyFor', () => {
  it('keys the icon choice by the token subject', () => {
    expect(avatarKeyFor(tokenFor({ sub: '42' }))).toBe('mindblaze_profile_icon:42')
  })

  it('falls back to a shared key when the token is missing or malformed', () => {
    expect(avatarKeyFor(null)).toBe('mindblaze_profile_icon:me')
    expect(avatarKeyFor('not-a-jwt')).toBe('mindblaze_profile_icon:me')
  })
})
