import request from '@/utils/request'

export const listOrders = (query) => {
  return request({
    url: '/companion/orders',
    method: 'get',
    params: query
  })
}

export const getOrder = (orderId) => {
  return request({
    url: `/companion/orders/${orderId}`,
    method: 'get'
  })
}

export const createOrder = (data) => {
  return request({
    url: '/companion/orders',
    method: 'post',
    data
  })
}

export const updateOrder = (data) => {
  return request({
    url: '/companion/orders',
    method: 'put',
    data
  })
}

export const assignOrder = (orderId, boosterId) => {
  return request({
    url: `/companion/orders/${orderId}/assign`,
    method: 'patch',
    data: { boosterId }
  })
}

export const updateOrderStatus = (orderId, status) => {
  return request({
    url: `/companion/orders/${orderId}/status`,
    method: 'patch',
    data: { status }
  })
}

export const removeOrder = (orderIds) => {
  return request({
    url: '/companion/orders',
    method: 'delete',
    data: orderIds
  })
}

export const getOrderMetrics = (query) => {
  return request({
    url: '/companion/orders/metrics',
    method: 'get',
    params: query
  })
}
