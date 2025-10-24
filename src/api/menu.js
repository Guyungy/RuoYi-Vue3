import request from '@/utils/request'
import companionMenus from '@/router/menus/companionMenu'

// fetch routers
export const getRouters = () => {
  if (import.meta.env.VITE_USE_LOCAL_MENU === 'true') {
    return Promise.resolve({
      data: companionMenus
    })
  }
  return request({
    url: '/getRouters',
    method: 'get'
  })
}
