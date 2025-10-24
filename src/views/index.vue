<template>
  <div class="dashboard-container">
    <section class="dashboard-greeting">
      <div>
        <h2>{{ greeting }}</h2>
        <p>{{ roleHint }}</p>
      </div>
      <div class="dashboard-meta">
        <span>{{ formattedLastUpdated }}</span>
      </div>
    </section>

    <el-row :gutter="16" class="dashboard-summary">
      <el-col
        v-for="card in summaryCards"
        :key="card.id"
        :xs="24"
        :sm="12"
        :lg="6"
        class="summary-wrapper"
      >
        <el-card shadow="hover" class="summary-card">
          <div class="summary-header">
            <span>{{ card.label }}</span>
            <el-tag
              v-if="card.delta !== undefined"
              :type="card.delta >= 0 ? 'success' : 'danger'"
              size="small"
            >
              {{ card.delta >= 0 ? '+' : '' }}{{ card.delta }}%
            </el-tag>
          </div>
          <div class="summary-value">
            <span>{{ formatNumber(card.value, card.format) }}</span>
            <small>{{ card.unit }}</small>
          </div>
          <p class="summary-desc">{{ card.description }}</p>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="dashboard-metrics">
      <el-col :xs="24" :lg="16">
        <el-card shadow="hover" class="metric-card">
          <template #header>
            <span>订单趋势</span>
          </template>
          <div ref="trendChartRef" class="trend-chart"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="hover" class="metric-card">
          <template #header>
            <span>高光打手</span>
          </template>
          <el-empty v-if="!hotBoosters.length" description="暂无数据" />
          <el-timeline v-else class="booster-timeline">
            <el-timeline-item
              v-for="booster in hotBoosters"
              :key="booster.name"
              :timestamp="`${booster.orders}单 · ${booster.rating}分`"
              placement="top"
            >
              <div class="booster-item">
                <div>
                  <p class="booster-name">{{ booster.name }}</p>
                  <small class="booster-skill">{{ booster.skill }}</small>
                </div>
                <div class="booster-extra">
                  <span class="booster-price">¥{{ booster.price }}/小时</span>
                  <el-tag size="small" :type="booster.status === '在线' ? 'success' : 'info'">
                    {{ booster.status }}
                  </el-tag>
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="dashboard-lists">
      <el-col :xs="24" :lg="16">
        <el-card shadow="hover" class="metric-card">
          <template #header>
            <span>{{ orderListTitle }}</span>
          </template>
          <el-table
            v-if="orderQueue.length"
            :data="orderQueue"
            size="small"
            border
            class="order-table"
          >
            <el-table-column prop="orderNo" label="订单号" min-width="140" />
            <el-table-column prop="game" label="游戏" min-width="110" />
            <el-table-column prop="mode" label="模式" min-width="100" />
            <el-table-column prop="boss" label="老板" min-width="110" v-if="showBossColumn" />
            <el-table-column prop="booster" label="打手" min-width="110" v-if="showBoosterColumn" />
            <el-table-column label="状态" min-width="110">
              <template #default="scope">
                <el-tag :type="statusTagType(scope.row.status)">
                  {{ scope.row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="eta" label="预计开局" min-width="110" />
            <el-table-column label="订单价值" min-width="110" v-if="showOrderValue">
              <template #default="scope">
                {{ formatNumber(scope.row.value, 'currency') }}
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="暂无待处理订单" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="hover" class="metric-card">
          <template #header>
            <span>服务满意度</span>
          </template>
          <div class="satisfaction-wrapper">
            <el-progress
              type="circle"
              :percentage="satisfactionRate"
              :stroke-width="8"
              color="#4bde80"
            />
            <ul class="satisfaction-tags">
              <li v-for="item in satisfactionTags" :key="item.label">
                <span>{{ item.label }}</span>
                <el-tag size="small" type="success">
                  {{ item.value }}
                </el-tag>
              </li>
            </ul>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { getOrderMetrics } from '@/api/companion/order'
import useUserStore from '@/store/modules/user'

const userStore = useUserStore()

const roles = computed(() => userStore.roles || [])

const scope = computed(() => {
  if (roles.value.includes('manager') || roles.value.includes('admin')) {
    return 'manager'
  }
  if (roles.value.includes('boss')) {
    return 'boss'
  }
  return 'booster'
})

const roleAlias = computed(() => {
  if (scope.value === 'manager') {
    return '陪玩运营官'
  }
  if (scope.value === 'boss') {
    return '尊敬的老板'
  }
  return '辛苦的打手伙伴'
})

const greeting = computed(() => {
  const hour = new Date().getHours()
  const prefix = hour < 6
    ? '凌晨好'
    : hour < 12
      ? '上午好'
      : hour < 18
        ? '下午好'
        : '晚上好'
  return `${prefix}，${roleAlias.value}`
})

const roleHint = computed(() => {
  if (scope.value === 'manager') {
    return '今日重点关注高价值订单派单效率与打手在线率。'
  }
  if (scope.value === 'boss') {
    return '可在此查看订单进度与打手反馈，合理安排开黑时段。'
  }
  return '请及时确认接单与完单进度，保持响应以获得更多推荐。'
})

const orderListTitle = computed(() => {
  if (scope.value === 'manager') {
    return '当前订单处理队列'
  }
  if (scope.value === 'boss') {
    return '最近下单记录'
  }
  return '待处理任务'
})

const showBossColumn = computed(() => scope.value !== 'boss')
const showBoosterColumn = computed(() => scope.value !== 'booster')
const showOrderValue = computed(() => scope.value !== 'booster')

const summaryCards = ref([])
const trendData = ref([])
const orderQueue = ref([])
const hotBoosters = ref([])
const satisfactionRate = ref(0)
const satisfactionTags = ref([])
const lastUpdated = ref('')

const trendChartRef = ref(null)
let trendChartInstance = null

const defaultMetrics = {
  summary: {
    todayOrders: 42,
    todayOrdersDelta: 18,
    processing: 19,
    processingDelta: -6,
    revenue: 12873,
    revenueDelta: 12,
    boosterOnline: 34,
    boosterDelta: 8,
    satisfaction: 94,
    satisfactionDelta: 3
  },
  trend: [
    { label: '周一', total: 36, completed: 28 },
    { label: '周二', total: 42, completed: 33 },
    { label: '周三', total: 48, completed: 41 },
    { label: '周四', total: 39, completed: 35 },
    { label: '周五', total: 55, completed: 47 },
    { label: '周六', total: 62, completed: 53 },
    { label: '周日', total: 58, completed: 51 }
  ],
  boosters: [
    { name: '花落成双', skill: '王者荣耀 · 辅助', rating: 4.9, price: 68, status: '在线', orders: 76 },
    { name: '北城以南', skill: '英雄联盟 · 中单', rating: 4.8, price: 88, status: '在线', orders: 63 },
    { name: '南巷清风', skill: '永劫无间 · 指挥', rating: 4.7, price: 78, status: '休息', orders: 45 }
  ],
  queue: [
    {
      orderNo: 'OD2025102401',
      boss: '林染',
      booster: '北城以南',
      game: '英雄联盟',
      mode: '单双排',
      status: '待派单',
      eta: '15分钟',
      value: 268
    },
    {
      orderNo: 'OD2025102402',
      boss: '江雪',
      booster: '花落成双',
      game: '王者荣耀',
      mode: '陪练上分',
      status: '进行中',
      eta: '正在进行',
      value: 188
    },
    {
      orderNo: 'OD2025102403',
      boss: '陈昊',
      booster: '南巷清风',
      game: '永劫无间',
      mode: '吃鸡冲分',
      status: '待确认',
      eta: '21:00',
      value: 320
    }
  ],
  satisfactionTags: [
    { label: '五星好评', value: '64%' },
    { label: '回头客', value: '42%' },
    { label: '打手准时率', value: '97%' }
  ],
  lastUpdated: '2025-10-24T17:00:00+08:00'
}

const formattedLastUpdated = computed(() => {
  if (!lastUpdated.value) {
    return '最后更新：--'
  }
  const time = new Date(lastUpdated.value)
  if (Number.isNaN(time.getTime())) {
    return `最后更新：${lastUpdated.value}`
  }
  const formatted = [
    time.getFullYear(),
    String(time.getMonth() + 1).padStart(2, '0'),
    String(time.getDate()).padStart(2, '0')
  ].join('-')
  const h = String(time.getHours()).padStart(2, '0')
  const m = String(time.getMinutes()).padStart(2, '0')
  return `最后更新：${formatted} ${h}:${m}`
})

const formatNumber = (value, format) => {
  const number = Number(value || 0)
  if (format === 'currency') {
    return `¥${number.toLocaleString('zh-CN', { minimumFractionDigits: 0 })}`
  }
  if (format === 'percent') {
    return `${number.toFixed(0)}%`
  }
  return number.toLocaleString('zh-CN')
}

const statusTagType = (status) => {
  const map = {
    待派单: 'warning',
    进行中: 'info',
    待确认: 'primary',
    已完成: 'success',
    已取消: 'info'
  }
  return map[status] || 'default'
}

const buildSummaryCards = (summary) => {
  summaryCards.value = [
    {
      id: 'todayOrders',
      label: '今日新增订单',
      value: summary.todayOrders,
      unit: '单',
      delta: summary.todayOrdersDelta,
      description: '订单需求持续走高'
    },
    {
      id: 'processing',
      label: '进行中订单',
      value: summary.processing,
      unit: '单',
      delta: summary.processingDelta,
      description: '监控派单与履约进度'
    },
    {
      id: 'revenue',
      label: '预计GMV',
      value: summary.revenue,
      unit: '',
      format: 'currency',
      delta: summary.revenueDelta,
      description: '包含当日已付款订单'
    },
    {
      id: 'boosterOnline',
      label: '在线打手',
      value: summary.boosterOnline,
      unit: '人',
      delta: summary.boosterDelta,
      description: '可立即接单的打手数量'
    }
  ]
  satisfactionRate.value = Math.round(summary.satisfaction || 0)
}

const setDashboardData = (metrics = defaultMetrics) => {
  const merged = {
    ...defaultMetrics,
    ...metrics,
    summary: { ...defaultMetrics.summary, ...(metrics.summary || {}) }
  }
  buildSummaryCards(merged.summary)
  trendData.value = merged.trend || []
  orderQueue.value = merged.queue || []
  hotBoosters.value = merged.boosters || []
  satisfactionTags.value = merged.satisfactionTags || []
  lastUpdated.value = merged.lastUpdated || ''
}

const handleResize = () => {
  if (trendChartInstance) {
    trendChartInstance.resize()
  }
}

const initTrendChart = () => {
  if (!trendChartRef.value) {
    return
  }
  if (!trendChartInstance) {
    trendChartInstance = echarts.init(trendChartRef.value)
    window.addEventListener('resize', handleResize)
  }
  const categories = trendData.value.map((item) => item.label)
  const totalSeries = trendData.value.map((item) => item.total)
  const completedSeries = trendData.value.map((item) => item.completed)

  const option = {
    color: ['#409EFF', '#67C23A'],
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['总订单', '已完成']
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: categories
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '总订单',
        type: 'line',
        smooth: true,
        areaStyle: {
          opacity: 0.15
        },
        data: totalSeries
      },
      {
        name: '已完成',
        type: 'line',
        smooth: true,
        areaStyle: {
          opacity: 0.1
        },
        data: completedSeries
      }
    ]
  }
  trendChartInstance.setOption(option)
}

const fetchMetrics = async () => {
  try {
    const { data } = await getOrderMetrics({ scope: scope.value })
    setDashboardData(data || defaultMetrics)
  } catch (error) {
    console.warn('[dashboard] 获取仪表盘数据失败，使用默认数据。', error)
    setDashboardData(defaultMetrics)
  } finally {
    await nextTick()
    initTrendChart()
  }
}

setDashboardData(defaultMetrics)

watch(scope, () => {
  fetchMetrics()
}, { immediate: true })

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (trendChartInstance) {
    trendChartInstance.dispose()
    trendChartInstance = null
  }
})
</script>

<style scoped lang="scss">
.dashboard-container {
  padding: 24px;
  background-color: #f5f7fa;

  .dashboard-greeting {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 16px;

    h2 {
      margin: 0 0 6px;
      font-weight: 600;
      color: #1f2f3d;
    }

    p {
      margin: 0;
      color: #606266;
      font-size: 14px;
    }

    .dashboard-meta {
      color: #909399;
      font-size: 12px;
    }
  }
}

.summary-wrapper {
  margin-bottom: 16px;
}

.summary-card {
  .summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    color: #606266;
    margin-bottom: 8px;
  }

  .summary-value {
    display: flex;
    align-items: baseline;
    font-size: 28px;
    font-weight: 600;
    color: #1f2f3d;

    small {
      margin-left: 4px;
      font-size: 12px;
      color: #909399;
    }
  }

  .summary-desc {
    margin: 12px 0 0;
    font-size: 12px;
    color: #a0a4a8;
  }
}

.metric-card {
  margin-bottom: 16px;
}

.trend-chart {
  width: 100%;
  height: 320px;
}

.booster-timeline {
  max-height: 320px;
  overflow: auto;
}

.booster-item {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .booster-name {
    margin: 0;
    font-weight: 600;
    color: #1f2f3d;
  }

  .booster-skill {
    color: #909399;
  }

  .booster-extra {
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-end;
  }

  .booster-price {
    color: #67c23a;
    font-weight: 500;
  }
}

.order-table {
  width: 100%;
}

.satisfaction-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.satisfaction-tags {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #606266;
    font-size: 13px;
    min-width: 140px;
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 16px;
  }

  .trend-chart {
    height: 260px;
  }

  .satisfaction-wrapper {
    flex-direction: column;
  }
}
</style>
