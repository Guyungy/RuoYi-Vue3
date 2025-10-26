import request from '@/utils/request'

export const listBosses = (query) => {
  return request({
    url: '/companion/bosses',
    method: 'get',
    params: query
  })
}

export const getBoss = (bossId) => {
  return request({
    url: `/companion/bosses/${bossId}`,
    method: 'get'
  })
}

export const addBoss = (data) => {
  return request({
    url: '/companion/bosses',
    method: 'post',
    data
  })
}

export const updateBoss = (data) => {
  return request({
    url: '/companion/bosses',
    method: 'put',
    data
  })
}

export const removeBoss = (bossIds) => {
  return request({
    url: '/companion/bosses',
    method: 'delete',
    data: bossIds
  })
}
