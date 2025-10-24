import request from '@/utils/request'

export const listBoosters = (query) => {
  return request({
    url: '/companion/boosters',
    method: 'get',
    params: query
  })
}

export const getBooster = (boosterId) => {
  return request({
    url: `/companion/boosters/${boosterId}`,
    method: 'get'
  })
}

export const addBooster = (data) => {
  return request({
    url: '/companion/boosters',
    method: 'post',
    data
  })
}

export const updateBooster = (data) => {
  return request({
    url: '/companion/boosters',
    method: 'put',
    data
  })
}

export const changeBoosterStatus = (boosterId, status) => {
  return request({
    url: `/companion/boosters/${boosterId}/status`,
    method: 'patch',
    data: { status }
  })
}

export const removeBooster = (boosterIds) => {
  return request({
    url: '/companion/boosters',
    method: 'delete',
    data: boosterIds
  })
}
