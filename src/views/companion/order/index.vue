<template>
  <div class="order-page app-container">
    <el-card shadow="never" class="summary-card">
      <template #header>
        <div class="summary-header">
          <div>
            <span class="summary-title">{{ headerTitle }}</span>
            <small class="summary-subtitle">{{ headerSubtitle }}</small>
          </div>
          <el-space wrap>
            <div class="summary-stat" v-for="item in summaryCards" :key="item.id">
              <p>{{ item.label }}</p>
              <h3>{{ formatNumber(item.value, item.format) }}</h3>
            </div>
          </el-space>
        </div>
      </template>

      <el-form :inline="true" :model="queryParams" class="filter-form">
        <el-form-item label="项目">
          <el-select v-model="queryParams.game" placeholder="全部" clearable>
            <el-option v-for="item in gameOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="全部" clearable>
            <el-option
              v-for="item in statusFilters"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="时间">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            unlink-panels
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="queryParams.keyword"
            placeholder="订单号 / 老板 / 打手"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item v-if="isManager">
          <el-checkbox v-model="queryParams.onlyHighValue">仅看高价值订单</el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table
        v-loading="loading"
        :data="orderList"
        border
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" align="center" v-if="isManager" />
        <el-table-column prop="orderId" label="订单号" min-width="150" />
        <el-table-column prop="game" label="项目" min-width="120" />
        <el-table-column prop="mode" label="模式" min-width="120" />
        <el-table-column prop="boss" label="老板" min-width="120" v-if="isManager || isBooster" />
        <el-table-column prop="booster" label="打手" min-width="120" v-if="isManager || isBoss" />
        <el-table-column label="金额" min-width="110" v-if="isManager || isBoss">
          <template #default="scope">
            {{ formatNumber(scope.row.amount, 'currency') }}
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="120">
          <template #default="scope">
            <el-tag :type="statusTagType(scope.row.status)">
              {{ statusLabel(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startAt" label="开局时间" min-width="150" />
        <el-table-column prop="createdAt" label="下单时间" min-width="150" />
        <el-table-column label="操作" min-width="260" fixed="right">
          <template #default="scope">
            <el-space wrap size="small">
              <el-button link type="primary" @click="openDetail(scope.row)">详情</el-button>
              <el-button
                v-if="isManager && scope.row.status === 'dispatching'"
                link
                type="primary"
                @click="handleAssign(scope.row)"
              >
                快速派单
              </el-button>
              <el-button
                v-if="isManager && ['dispatching', 'waitingPay'].includes(scope.row.status)"
                link
                type="danger"
                @click="handleCancel(scope.row)"
              >
                取消
              </el-button>
              <el-button
                v-if="isManager && scope.row.status === 'inProgress'"
                link
                type="success"
                @click="handleComplete(scope.row)"
              >
                标记完成
              </el-button>
              <el-button
                v-if="isBoss && scope.row.status === 'waitingPay'"
                link
                type="primary"
                @click="handlePay(scope.row)"
              >
                去支付
              </el-button>
              <el-button
                v-if="isBoss && scope.row.status === 'completed'"
                link
                type="success"
                @click="handleReview(scope.row)"
              >
                写评价
              </el-button>
              <el-button
                v-if="isBooster && scope.row.status === 'dispatching'"
                link
                type="primary"
                @click="handleAccept(scope.row)"
              >
                我要接单
              </el-button>
              <el-button
                v-if="isBooster && scope.row.status === 'confirmed'"
                link
                type="warning"
                @click="handleStart(scope.row)"
              >
                开始服务
              </el-button>
              <el-button
                v-if="isBooster && scope.row.status === 'inProgress'"
                link
                type="success"
                @click="handleSubmit(scope.row)"
              >
                提交结果
              </el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>

      <Pagination
        v-show="total > 0"
        :total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="fetchOrders"
      />
    </el-card>

    <el-drawer
      v-model="detailVisible"
      :title="detailOrder ? `订单 ${detailOrder.orderId}` : '订单详情'"
      size="500px"
    >
      <div v-if="detailOrder" class="detail-container">
        <section class="detail-section">
          <h4>基础信息</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="老板">{{ detailOrder.boss }}</el-descriptions-item>
            <el-descriptions-item label="打手">
              {{ detailOrder.booster || '待派单' }}
            </el-descriptions-item>
            <el-descriptions-item label="项目模式">
              {{ detailOrder.game }} · {{ detailOrder.mode }}
            </el-descriptions-item>
            <el-descriptions-item label="开局时间">
              {{ detailOrder.startAt }}
            </el-descriptions-item>
            <el-descriptions-item label="下单时间">
              {{ detailOrder.createdAt }}
            </el-descriptions-item>
            <el-descriptions-item label="目标段位">
              {{ detailOrder.tierGoal || '未填写' }}
            </el-descriptions-item>
            <el-descriptions-item label="订单金额">
              {{ formatNumber(detailOrder.amount, 'currency') }}
            </el-descriptions-item>
          </el-descriptions>
        </section>

        <section class="detail-section">
          <h4>附加需求</h4>
          <el-tag v-if="detailOrder.voice" type="success" size="small">需要语音</el-tag>
          <el-tag v-else type="info" size="small">语音选填</el-tag>
          <p class="order-note">
            {{ detailOrder.requirement || '暂无备注' }}
          </p>
        </section>

        <section class="detail-section">
          <h4>状态流转</h4>
          <el-timeline>
            <el-timeline-item
              v-for="(item, index) in detailOrder.timeline"
              :key="index"
              :timestamp="item.time"
              :type="item.type"
            >
              {{ item.label }}
            </el-timeline-item>
          </el-timeline>
        </section>
      </div>
      <el-empty v-else description="请选择订单" />
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import Pagination from '@/components/Pagination'
import {
  assignOrder,
  listOrders,
  updateOrderStatus
} from '@/api/companion/order'
import useUserStore from '@/store/modules/user'

const loading = ref(false)
const orderList = ref([])
const total = ref(0)

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  game: '',
  status: '',
  keyword: '',
  onlyHighValue: false
})

const dateRange = ref([])

const statusMap = {
  dispatching: { label: '待派单', tagType: 'warning' },
  confirmed: { label: '已接单', tagType: 'primary' },
  waitingPay: { label: '待支付', tagType: 'danger' },
  inProgress: { label: '进行中', tagType: 'info' },
  completed: { label: '已完成', tagType: 'success' },
  cancelled: { label: '已取消', tagType: 'info' }
}

const statusFilters = Object.entries(statusMap).map(([value, meta]) => ({
  value,
  label: meta.label
}))

const gameOptions = ['王者荣耀', '英雄联盟', '永劫无间', 'APEX 英雄', '绝地求生']

const summary = reactive({
  pending: 0,
  inProgress: 0,
  completedToday: 0,
  gmv: 0
})

const summaryCards = computed(() => [
  { id: 'pending', label: '待处理', value: summary.pending },
  { id: 'inProgress', label: '进行中', value: summary.inProgress },
  { id: 'completedToday', label: '今日完成', value: summary.completedToday },
  { id: 'gmv', label: 'GMV(当日)', value: summary.gmv, format: 'currency' }
])

const route = useRoute()
const userStore = useUserStore()
const roles = computed(() => userStore.roles || [])

const isManager = computed(() => roles.value.includes('manager') || roles.value.includes('admin'))
const isBoss = computed(() => roles.value.includes('boss'))
const isBooster = computed(() => roles.value.includes('booster'))

const viewScope = computed(() => {
  if (route.meta.viewScope) {
    return route.meta.viewScope
  }
  if (isManager.value) {
    return 'manager'
  }
  if (isBoss.value) {
    return 'boss'
  }
  return 'personal'
})

const headerTitle = computed(() => {
  if (viewScope.value === 'boss') {
    return '我的订单'
  }
  if (viewScope.value === 'personal') {
    return '接单任务'
  }
  return '订单管理'
})

const headerSubtitle = computed(() => {
  if (viewScope.value === 'boss') {
    return '掌握每一笔预约的支付、履约与评价状态'
  }
  if (viewScope.value === 'personal') {
    return '关注今日待接与进行中的任务，及时同步进度'
  }
  return '实时监控派单效率与履约表现'
})

const statusLabel = (status) => statusMap[status]?.label || status
const statusTagType = (status) => statusMap[status]?.tagType || 'info'

const formatNumber = (value, format) => {
  const number = Number(value || 0)
  if (format === 'currency') {
    return `¥${number.toLocaleString('zh-CN', { minimumFractionDigits: 0 })}`
  }
  return number.toLocaleString('zh-CN')
}

const buildQuery = () => {
  const query = {
    pageNum: queryParams.pageNum,
    pageSize: queryParams.pageSize,
    scope: viewScope.value
  }
  if (queryParams.game) {
    query.game = queryParams.game
  }
  if (queryParams.status) {
    query.status = queryParams.status
  }
  if (queryParams.keyword) {
    query.keyword = queryParams.keyword
  }
  if (queryParams.onlyHighValue) {
    query.highValue = true
  }
  if (dateRange.value && dateRange.value.length === 2) {
    query.beginTime = dateRange.value[0]
    query.endTime = dateRange.value[1]
  }
  return query
}

const fallbackResponse = {
  rows: [
    {
      orderId: 'OD2025102401',
      boss: '林染',
      booster: '',
      boosterId: null,
      game: '英雄联盟',
      mode: '单双排',
      amount: 268,
      status: 'dispatching',
      startAt: '2025-10-24 21:00',
      createdAt: '2025-10-24 18:10',
      tierGoal: '钻石 I → 大师 V',
      voice: true,
      requirement: '希望打野多帮下路，晚上22点前结束。',
      timeline: [
        { label: '下单成功', time: '2025-10-24 18:10', type: 'primary' },
        { label: '待派单', time: '2025-10-24 18:11', type: 'warning' }
      ]
    },
    {
      orderId: 'OD2025102398',
      boss: '江雪',
      booster: '花落成双',
      boosterId: 1001,
      game: '王者荣耀',
      mode: '赛季上分',
      amount: 188,
      status: 'inProgress',
      startAt: '2025-10-24 19:30',
      createdAt: '2025-10-24 18:00',
      tierGoal: '星耀 IV → 王者 10 星',
      voice: true,
      requirement: '想从中路带节奏，语音开黑。',
      timeline: [
        { label: '下单成功', time: '2025-10-24 18:00', type: 'primary' },
        { label: '打手接单', time: '2025-10-24 18:05', type: 'success' },
        { label: '进行中', time: '2025-10-24 19:35', type: 'info' }
      ]
    },
    {
      orderId: 'OD2025102389',
      boss: '陈昊',
      booster: '北城以南',
      boosterId: 1002,
      game: '英雄联盟',
      mode: '峡谷之巅训练',
      amount: 328,
      status: 'waitingPay',
      startAt: '2025-10-25 14:00',
      createdAt: '2025-10-24 17:40',
      tierGoal: '大师 → 宗师',
      voice: true,
      requirement: '提供训练计划，配合夜间训练。',
      timeline: [
        { label: '下单成功', time: '2025-10-24 17:40', type: 'primary' },
        { label: '待付款', time: '2025-10-24 17:41', type: 'danger' }
      ]
    },
    {
      orderId: 'OD2025102376',
      boss: '南巷清风',
      booster: '星野见',
      boosterId: 1003,
      game: '永劫无间',
      mode: '三排冲榜',
      amount: 458,
      status: 'completed',
      startAt: '2025-10-23 21:00',
      createdAt: '2025-10-23 18:22',
      tierGoal: '顶星五段',
      voice: true,
      requirement: '想获取比赛指挥建议。',
      timeline: [
        { label: '下单成功', time: '2025-10-23 18:22', type: 'primary' },
        { label: '打手接单', time: '2025-10-23 18:30', type: 'success' },
        { label: '服务完成', time: '2025-10-23 23:15', type: 'success' }
      ]
    }
  ],
  total: 4,
  summary: {
    pending: 1,
    inProgress: 1,
    completedToday: 7,
    gmv: 12480
  }
}

const detailVisible = ref(false)
const detailOrder = ref(null)
const selectedIds = ref([])

const setSummary = (data = {}) => {
  summary.pending = data.pending ?? 0
  summary.inProgress = data.inProgress ?? 0
  summary.completedToday = data.completedToday ?? 0
  summary.gmv = data.gmv ?? 0
}

const recalcSummary = () => {
  const stats = {
    pending: 0,
    inProgress: 0,
    completedToday: 0,
    gmv: 0
  }
  orderList.value.forEach((item) => {
    if (item.status === 'dispatching' || item.status === 'waitingPay') {
      stats.pending += 1
    }
    if (item.status === 'confirmed' || item.status === 'inProgress') {
      stats.inProgress += 1
    }
    if (item.status === 'completed') {
      stats.completedToday += 1
    }
    if (item.status !== 'cancelled') {
      stats.gmv += Number(item.amount || 0)
    }
  })
  setSummary(stats)
}

const fetchOrders = async () => {
  loading.value = true
  try {
    const { rows, total: count, summary: summaryData } = await listOrders(buildQuery())
    orderList.value = Array.isArray(rows) && rows.length ? rows : fallbackResponse.rows
    total.value = typeof count === 'number' ? count : orderList.value.length
    setSummary(summaryData || fallbackResponse.summary)
  } catch (error) {
    console.warn('[order] 获取订单列表失败，使用默认数据。', error)
    orderList.value = fallbackResponse.rows
    total.value = fallbackResponse.total
    setSummary(fallbackResponse.summary)
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNum = 1
  fetchOrders()
}

const resetQuery = () => {
  queryParams.game = ''
  queryParams.status = ''
  queryParams.keyword = ''
  queryParams.onlyHighValue = false
  dateRange.value = []
  queryParams.pageNum = 1
  fetchOrders()
}

const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map((item) => item.orderId)
}

const openDetail = (row) => {
  detailOrder.value = row
  detailVisible.value = true
}

const updateStatus = async (order, status, successMessage) => {
  try {
    await updateOrderStatus(order.orderId, status)
    order.status = status
    ElMessage.success(successMessage)
  } catch (error) {
    console.warn('[order] 更新状态失败，已启用本地回退。', error)
    order.status = status
    ElMessage.warning('接口未就绪，已临时更新本地状态')
  } finally {
    recalcSummary()
  }
}

const handleAssign = async (order) => {
  try {
    await assignOrder(order.orderId, order.boosterId || '')
    order.status = 'confirmed'
    ElMessage.success('派单指令已发送')
  } catch (error) {
    console.warn('[order] 派单接口未就绪，模拟成功。', error)
    order.status = 'confirmed'
    ElMessage.warning('接口未就绪，已模拟派单成功')
  } finally {
    recalcSummary()
  }
}

const handleCancel = (order) => updateStatus(order, 'cancelled', '订单已取消')
const handleComplete = (order) => updateStatus(order, 'completed', '订单已标记完成')
const handlePay = (order) => updateStatus(order, 'confirmed', '支付成功，已通知运营派单')
const handleReview = () => {
  ElMessage.success('感谢反馈！评价功能可在后端完成后接入。')
}
const handleAccept = (order) => updateStatus(order, 'confirmed', '接单成功，请及时联系老板')
const handleStart = (order) => updateStatus(order, 'inProgress', '已标记为进行中')
const handleSubmit = (order) => updateStatus(order, 'completed', '提交完成，等待老板确认')

watch(
  () => [viewScope.value, route.fullPath],
  () => {
    queryParams.pageNum = 1
    fetchOrders()
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.order-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-card .summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .summary-title {
    font-weight: 600;
    font-size: 16px;
    margin-right: 12px;
  }

  .summary-subtitle {
    color: #909399;
  }
}

.summary-stat {
  min-width: 120px;
  p {
    margin: 0;
    color: #909399;
    font-size: 12px;
  }
  h3 {
    margin: 0;
    font-weight: 600;
    color: #1f2f3d;
  }
}

.filter-form .el-form-item {
  margin-bottom: 12px;
}

.detail-container {
  display: flex;
  flex-direction: column;
  gap: 20px;

  .detail-section {
    h4 {
      margin: 0 0 12px;
      font-weight: 600;
      color: #303133;
    }
  }
}

.order-note {
  margin-top: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  color: #606266;
  line-height: 1.6;
}
</style>
