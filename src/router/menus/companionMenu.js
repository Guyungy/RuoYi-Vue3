/**
 * 本地菜单配置，遵循若依后端路由结构。
 * 接入真实后端后，仅需返回同结构数据即可。
 */
const companionMenus = [
  {
    alwaysShow: true,
    component: 'Layout',
    hidden: false,
    name: 'OperationsCenter',
    path: '/operations',
    redirect: 'noRedirect',
    meta: {
      title: '陪玩运营',
      icon: 'component',
      roles: ['manager']
    },
    children: [
      {
        component: 'companion/booster/index',
        hidden: false,
        name: 'BoosterManagement',
        path: 'boosters',
        meta: {
          title: '打手管理',
          icon: 'user',
          roles: ['manager'],
          viewScope: 'manager'
        }
      },
      {
        component: 'companion/order/index',
        hidden: false,
        name: 'OrderManagement',
        path: 'orders',
        meta: {
          title: '订单管理',
          icon: 'list',
          roles: ['manager'],
          viewScope: 'manager'
        }
      },
      {
        component: 'companion/boss/index',
        hidden: false,
        name: 'BossManagement',
        path: 'bosses',
        meta: {
          title: '老板管理',
          icon: 'peoples',
          roles: ['manager'],
          viewScope: 'manager'
        }
      }
    ]
  },
  {
    alwaysShow: true,
    component: 'Layout',
    hidden: false,
    name: 'BoosterWorkspace',
    path: '/workspace',
    redirect: 'noRedirect',
    meta: {
      title: '打手工作台',
      icon: 'guide',
      roles: ['booster']
    },
    children: [
      {
        component: 'companion/order/index',
        hidden: false,
        name: 'BoosterAssignments',
        path: 'assignments',
        meta: {
          title: '我的订单',
          icon: 'form',
          roles: ['booster'],
          viewScope: 'personal'
        }
      }
    ]
  },
  {
    alwaysShow: true,
    component: 'Layout',
    hidden: false,
    name: 'BossPortal',
    path: '/boss',
    redirect: 'noRedirect',
    meta: {
      title: '老板中心',
      icon: 'chart',
      roles: ['boss']
    },
    children: [
      {
        component: 'companion/order/index',
        hidden: false,
        name: 'BossOrders',
        path: 'orders',
        meta: {
          title: '订单概览',
          icon: 'list',
          roles: ['boss'],
          viewScope: 'boss'
        }
      }
    ]
  }
]

export default companionMenus
