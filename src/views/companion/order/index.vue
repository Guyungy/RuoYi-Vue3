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
          <el-select v-model="queryParams.projectCode" placeholder="全部" clearable>
            <el-option
              v-for="item in projectOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.orderStatus" placeholder="全部" clearable>
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
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <div class="table-toolbar" v-if="isManager">
        <el-space wrap>
          <el-button type="primary" @click="handleAddOrder">新建订单</el-button>
          <el-button type="danger" plain :disabled="!selectedIds.length" @click="handleBatchRemove">
            批量删除
          </el-button>
        </el-space>
      </div>
      <el-table
        v-loading="loading"
        :data="orderList"
        border
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" align="center" v-if="isManager" />
        <el-table-column prop="orderNo" label="订单号" min-width="160" />
        <el-table-column prop="game" label="项目" min-width="140" />
        <el-table-column prop="mode" label="模式" min-width="140" />
        <el-table-column prop="boss" label="老板" min-width="140" v-if="isManager || isBooster" />
        <el-table-column prop="booster" label="打手" min-width="140" v-if="isManager || isBoss" />
        <el-table-column label="金额" min-width="120" v-if="isManager || isBoss">
          <template #default="scope">
            {{ formatNumber(scope.row.amount, 'currency') }}
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="130">
          <template #default="scope">
            <el-tag :type="statusTagType(scope.row.status)">
              {{ statusLabel(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startAt" label="开局时间" min-width="160" />
        <el-table-column prop="createdAt" label="下单时间" min-width="160" />
        <el-table-column label="操作" min-width="320" fixed="right">
          <template #default="scope">
            <el-space wrap size="small">
              <el-button link type="primary" @click="openDetail(scope.row)">详情</el-button>
              <el-button v-if="isManager" link type="primary" @click="handleEdit(scope.row)">编辑</el-button>
              <el-button
                v-if="isManager && scope.row.status === 'dispatching'"
                link
                type="primary"
                @click="handleAssign(scope.row)"
              >
                快速派单
              </el-button>
              <el-button
                v-if="isManager && ['dispatching', 'waitingPay', 'confirmed'].includes(scope.row.status)"
                link
                type="danger"
                @click="handleCancel(scope.row)"
              >
                取消
              </el-button>
              <el-button
                v-if="isManager && ['inProgress', 'confirmed'].includes(scope.row.status)"
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
                v-if="isBooster && scope.row.status === 'confirmed'"
                link
                type="primary"
                @click="handleAccept(scope.row)"
              >
                接单
              </el-button>
              <el-button
                v-if="isBooster && scope.row.status === 'inProgress'"
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
              <el-popconfirm
                v-if="isManager"
                title="确认删除该订单？"
                @confirm="handleDelete(scope.row)"
              >
                <template #reference>
                  <el-button link type="danger">删除</el-button>
                </template>
              </el-popconfirm>
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
      :title="detailOrder ? `订单 ${detailOrder.orderNo}` : '订单详情'"
      size="500px"
    >
      <div v-if="detailOrder" class="detail-container">
        <section class="detail-section">
          <h4>基础信息</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="订单号">{{ detailOrder.orderNo }}</el-descriptions-item>
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
            <el-descriptions-item label="结算状态">
              {{ detailOrder.settlementLabel }}
            </el-descriptions-item>
            <el-descriptions-item label="支付状态">
              {{ detailOrder.payStatusLabel }}
            </el-descriptions-item>
          </el-descriptions>
        </section>

        <section class="detail-section">
          <h4>附加需求</h4>
          <el-tag v-if="detailOrder.voice" type="success" size="small">需要语音</el-tag>
          <el-tag v-else type="info" size="small">语音选填</el-tag>
          <p class="order-note">
            {{ detailOrder.requirement || '暂无备注' }}
            <br v-if="detailOrder.internalRemark" />
            <span v-if="detailOrder.internalRemark">
              内部备注：{{ detailOrder.internalRemark }}
            </span>
          </p>
        </section>

        <section class="detail-section">
          <h4>状态流转</h4>
          <el-timeline v-if="detailOrder.timeline.length">
            <el-timeline-item
              v-for="(item, index) in detailOrder.timeline"
              :key="index"
              :timestamp="item.time"
              :type="item.type"
            >
              {{ item.label }}
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无流转信息" />
        </section>
      </div>
      <el-empty v-else description="请选择订单" />
    </el-drawer>

    <el-dialog
      v-model="formVisible"
      :title="formModel.orderId ? '编辑订单' : '新建订单'"
      width="780px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="formModel" :rules="formRules" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="老板ID" prop="bossId">
              <el-input-number v-model="formModel.bossId" :min="1" :precision="0" controls-position="right" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="打手ID">
              <el-input-number
                v-model="formModel.boosterId"
                :min="0"
                :precision="0"
                controls-position="right"
                placeholder="可选填"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="项目编码" prop="projectCode">
              <el-select
                v-model="formModel.projectCode"
                placeholder="请输入或选择项目"
                filterable
                allow-create
                default-first-option
              >
                <el-option
                  v-for="item in projectOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="游戏/项目">
              <el-input v-model="formModel.gameName" placeholder="如：王者荣耀·双排" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="服务模式" prop="serviceMode">
              <el-select v-model="formModel.serviceMode" placeholder="请选择服务模式">
                <el-option
                  v-for="item in serviceModeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="语音需求">
              <el-switch v-model="formModel.voiceRequired" active-value="1" inactive-value="0" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预计时长" prop="duration">
              <el-input-number
                v-model="formModel.duration"
                :min="0.5"
                :step="0.5"
                :precision="1"
                controls-position="right"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="小时单价" prop="unitPrice">
              <el-input-number
                v-model="formModel.unitPrice"
                :min="0"
                :step="10"
                :precision="2"
                controls-position="right"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="优惠金额">
              <el-input-number
                v-model="formModel.discountAmount"
                :min="0"
                :step="10"
                :precision="2"
                controls-position="right"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="订单金额">
              <el-input v-model="formModel.amountDisplay" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="应付金额">
              <el-input v-model="formModel.payableAmountDisplay" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="订单状态">
              <el-select v-model="formModel.orderStatus">
                <el-option
                  v-for="item in statusFilters"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="支付状态">
              <el-select v-model="formModel.payStatus">
                <el-option
                  v-for="item in payStatusOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结算状态">
              <el-select v-model="formModel.settlementStatus">
                <el-option
                  v-for="item in settlementStatusOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="开局时间">
              <el-date-picker
                v-model="formModel.startTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="选择开局时间"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="老板备注">
              <el-input
                v-model="formModel.bossRemark"
                type="textarea"
                :rows="3"
                placeholder="补充老板诉求、语音偏好等"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="内部备注">
              <el-input
                v-model="formModel.internalRemark"
                type="textarea"
                :rows="3"
                placeholder="派单说明、风控提示等"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取 消</el-button>
        <el-button type="primary" :loading="formLoading" @click="submitOrderForm">保 存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, getCurrentInstance } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import Pagination from '@/components/Pagination'
import {
  assignOrder,
  createOrder,
  getOrder,
  getOrderMetrics,
  listOrders,
  removeOrder,
  updateOrder,
  updateOrderStatus
} from '@/api/companion/order'
import useUserStore from '@/store/modules/user'
import { parseTime } from '@/utils/ruoyi'

const { proxy } = getCurrentInstance() || {}
const dictRefs = proxy?.useDict
  ? proxy.useDict('companion_service_mode', 'companion_settlement_status')
  : {}
const serviceModeDict = dictRefs?.companion_service_mode || ref([])
const settlementDict = dictRefs?.companion_settlement_status || ref([])
const serviceModeOptions = computed(() => serviceModeDict.value || [])
const settlementStatusOptions = computed(() => {
  const dict = settlementDict.value || []
  return dict.map((item) => ({ value: item.value, label: item.label }))
})

const loading = ref(false)
const orderList = ref([])
const total = ref(0)
const projectOptions = ref([])
const formVisible = ref(false)
const formLoading = ref(false)
const formRef = ref(null)
const formModel = reactive(createOrderForm())
const formRules = {
  bossId: [{ required: true, message: '请输入老板ID', trigger: 'blur' }],
  projectCode: [{ required: true, message: '请选择项目', trigger: 'change' }],
  serviceMode: [{ required: true, message: '请选择服务模式', trigger: 'change' }],
  duration: [{ required: true, message: '请输入预计时长', trigger: 'blur' }],
  unitPrice: [{ required: true, message: '请输入小时单价', trigger: 'blur' }]
}
const selectedIds = ref([])

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  projectCode: '',
  orderStatus: '',
  keyword: ''
})

const dateRange = ref([])

const statusMap = {
  dispatching: { label: '待派单', tagType: 'warning' },
  confirmed: { label: '已接单', tagType: 'primary' },
  waitingPay: { label: '待支付', tagType: 'danger' },
  inProgress: { label: '进行中', tagType: 'info' },
  completed: { label: '已完成', tagType: 'success' },
  cancelled: { label: '已取消', tagType: 'info' },
  refunding: { label: '售后中', tagType: 'danger' },
  refunded: { label: '已退款', tagType: 'success' }
}

const statusFilters = Object.entries(statusMap).map(([value, meta]) => ({
  value,
  label: meta.label
}))
const statusLabel = (status) => statusMap[status]?.label || status
const statusTagType = (status) => statusMap[status]?.tagType || 'info'

const payStatusMap = {
  unpaid: '未支付',
  paid: '已支付',
  partial: '部分支付',
  refunding: '退款中',
  refunded: '已退款'
}
const payStatusOptions = Object.entries(payStatusMap).map(([value, label]) => ({ value, label }))

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

const formatNumber = (value, format) => {
  const number = Number(value || 0)
  if (format === 'currency') {
    return `¥${number.toLocaleString('zh-CN', { minimumFractionDigits: 0 })}`
  }
  return number.toLocaleString('zh-CN')
}

const serviceModeLabel = (value) => {
  const dict = serviceModeDict.value || []
  const target = dict.find((item) => item.value === value)
  return target ? target.label : value || '未设置'
}

const settlementLabel = (value) => {
  const dict = settlementDict.value || []
  const target = dict.find((item) => item.value === value)
  return target ? target.label : value || '—'
}

const payStatusLabel = (value) => payStatusMap[value] || value || '—'

function createOrderForm() {
  return {
    orderId: null,
    orderNo: '',
    bossId: null,
    boosterId: null,
    projectCode: '',
    gameName: '',
    serviceMode: '',
    duration: 1,
    unitPrice: 0,
    discountAmount: 0,
    amount: 0,
    payableAmount: 0,
    amountDisplay: '¥0',
    payableAmountDisplay: '¥0',
    orderStatus: 'dispatching',
    payStatus: 'unpaid',
    settlementStatus: 'pending',
    voiceRequired: '0',
    startTime: '',
    bossRemark: '',
    internalRemark: ''
  }
}

const updateAmountPreview = () => {
  const duration = Number(formModel.duration || 0)
  const unitPrice = Number(formModel.unitPrice || 0)
  const discount = Number(formModel.discountAmount || 0)
  const amount = Number((duration * unitPrice).toFixed(2))
  const payable = Number(Math.max(amount - discount, 0).toFixed(2))
  formModel.amount = amount
  formModel.payableAmount = payable
  formModel.amountDisplay = formatNumber(amount, 'currency')
  formModel.payableAmountDisplay = formatNumber(payable, 'currency')
}

watch(
  () => [formModel.duration, formModel.unitPrice, formModel.discountAmount],
  updateAmountPreview,
  { immediate: true }
)

const fillOrderForm = (data = {}) => {
  const base = createOrderForm()
  Object.assign(formModel, base, {
    ...data,
    bossId: data.bossId ?? data.boss?.bossId ?? base.bossId,
    boosterId: data.boosterId ?? data.booster?.boosterId ?? base.boosterId,
    duration: Number(data.duration ?? base.duration),
    unitPrice: Number(data.unitPrice ?? base.unitPrice),
    discountAmount: Number(data.discountAmount ?? base.discountAmount),
    orderStatus: data.orderStatus || base.orderStatus,
    payStatus: data.payStatus || base.payStatus,
    settlementStatus: data.settlementStatus || base.settlementStatus,
    voiceRequired: data.voiceRequired ?? base.voiceRequired,
    startTime: data.startTime ? parseTime(data.startTime, '{y}-{m}-{d} {h}:{i}:{s}') : ''
  })
  if (data.amount != null) {
    formModel.amount = Number(data.amount)
  }
  if (data.payableAmount != null) {
    formModel.payableAmount = Number(data.payableAmount)
  }
  updateAmountPreview()
}

const buildOrderPayload = () => ({
  orderId: formModel.orderId,
  orderNo: formModel.orderNo,
  bossId: formModel.bossId,
  boosterId: formModel.boosterId || null,
  projectCode: formModel.projectCode,
  gameName: formModel.gameName,
  serviceMode: formModel.serviceMode,
  duration: formModel.duration,
  unitPrice: formModel.unitPrice,
  discountAmount: formModel.discountAmount || 0,
  amount: formModel.amount,
  payableAmount: formModel.payableAmount,
  orderStatus: formModel.orderStatus,
  payStatus: formModel.payStatus,
  settlementStatus: formModel.settlementStatus,
  startTime: formModel.startTime || null,
  voiceRequired: formModel.voiceRequired,
  bossRemark: formModel.bossRemark,
  internalRemark: formModel.internalRemark
})

const handleAddOrder = () => {
  Object.assign(formModel, createOrderForm())
  updateAmountPreview()
  formVisible.value = true
}

const handleEdit = async (row) => {
  const targetId = row?.id || row?.orderId
  if (!targetId) return
  try {
    const { data } = await getOrder(targetId)
    fillOrderForm(data || { orderId: targetId })
    formVisible.value = true
  } catch (error) {
    console.warn('[order] 获取订单信息失败', error)
  }
}

const submitOrderForm = () => {
  if (!formRef.value) return
  formRef.value.validate(async (valid) => {
    if (!valid) return
    formLoading.value = true
    try {
      const payload = buildOrderPayload()
      if (payload.orderId) {
        await updateOrder(payload)
      } else {
        await createOrder(payload)
      }
      ElMessage.success('保存成功')
      formVisible.value = false
      fetchOrders()
    } catch (error) {
      console.warn('[order] 保存订单失败', error)
    } finally {
      formLoading.value = false
    }
  })
}

const handleDelete = async (row) => {
  if (!row?.id) return
  try {
    await removeOrder([row.id])
    ElMessage.success('删除成功')
    fetchOrders()
  } catch (error) {
    console.warn('[order] 删除订单失败', error)
  }
}

const handleBatchRemove = async () => {
  if (!selectedIds.value.length) return
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 笔订单吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await removeOrder(selectedIds.value)
    ElMessage.success('批量删除成功')
    fetchOrders()
  } catch (error) {
    if (error === 'cancel') {
      return
    }
    console.warn('[order] 批量删除失败', error)
  }
}

const buildTimeline = (order) => {
  const items = []
  const format = (time) => (time ? parseTime(time, '{y}-{m}-{d} {h}:{i}') : '—')

  if (order.createdTime) {
    items.push({ label: '下单成功', time: format(order.createdTime), type: 'primary' })
  }
  if (order.orderStatus === 'waitingPay') {
    items.push({ label: '待支付', time: format(order.createdTime), type: 'danger' })
  }
  if (order.boosterId) {
    items.push({ label: '打手接单', time: format(order.updatedTime), type: 'success' })
  }
  if (order.orderStatus === 'confirmed') {
    items.push({ label: '待开局', time: format(order.startTime), type: 'info' })
  }
  if (order.orderStatus === 'inProgress') {
    items.push({ label: '进行中', time: format(order.startTime), type: 'info' })
  }
  if (order.orderStatus === 'completed') {
    items.push({ label: '服务完成', time: format(order.finishTime), type: 'success' })
  }
  if (order.orderStatus === 'cancelled') {
    items.push({ label: '已取消', time: format(order.cancelTime), type: 'warning' })
  }

  return items.filter((item) => item.time && item.time !== '—')
}

const normalizeOrder = (item = {}) => {
  const id = item.orderId
  const amount = Number(item.payableAmount ?? item.amount ?? 0)
  const tierGoal =
    item.tierFrom && item.tierTo
      ? `${item.tierFrom} → ${item.tierTo}`
      : item.tierTo || item.tierFrom || ''
  const status = item.orderStatus || 'dispatching'

  return {
    ...item,
    id,
    orderNo: item.orderNo || (id ? `OD${String(id).padStart(6, '0')}` : '—'),
    boss: item.bossName || '—',
    booster: item.boosterName || '',
    boosterId: item.boosterId,
    projectCode: item.projectCode,
    game: item.gameName || '—',
    mode: serviceModeLabel(item.serviceMode),
    rawMode: item.serviceMode,
    status,
    amount,
    startAt: item.startTime ? parseTime(item.startTime, '{y}-{m}-{d} {h}:{i}') : '—',
    createdAt: item.createdTime ? parseTime(item.createdTime, '{y}-{m}-{d} {h}:{i}') : '—',
    tierGoal,
    voice: item.voiceRequired === true || item.voiceRequired === 'Y',
    requirement: item.bossRemark || '',
    internalRemark: item.internalRemark || '',
    settlementLabel: settlementLabel(item.settlementStatus),
    payStatusLabel: payStatusLabel(item.payStatus),
    timeline: buildTimeline(item)
  }
}

const buildProjectOptions = (rows = []) => {
  const map = new Map()
  rows.forEach((item) => {
    if (!item.projectCode) {
      return
    }
    if (!map.has(item.projectCode)) {
      map.set(item.projectCode, item.gameName || item.projectCode)
    }
  })
  projectOptions.value = Array.from(map.entries()).map(([value, label]) => ({ value, label }))
}

const recalcSummary = () => {
  const stats = {
    pending: 0,
    inProgress: 0,
    completedToday: 0,
    gmv: 0
  }
  orderList.value.forEach((item) => {
    if (['dispatching', 'waitingPay'].includes(item.status)) {
      stats.pending += 1
    }
    if (['confirmed', 'inProgress'].includes(item.status)) {
      stats.inProgress += 1
    }
    if (item.status === 'completed') {
      stats.completedToday += 1
    }
    if (item.status !== 'cancelled') {
      stats.gmv += Number(item.amount || 0)
    }
  })
  summary.pending = stats.pending
  summary.inProgress = stats.inProgress
  summary.completedToday = stats.completedToday
  summary.gmv = stats.gmv
}

const applyMetrics = (data) => {
  if (data && Object.prototype.hasOwnProperty.call(data, 'revenue')) {
    summary.gmv = Number(data.revenue || summary.gmv)
  }
}

const buildQuery = () => {
  const query = {
    pageNum: queryParams.pageNum,
    pageSize: queryParams.pageSize,
    scope: viewScope.value
  }
  if (queryParams.projectCode) {
    query.projectCode = queryParams.projectCode
  }
  if (queryParams.orderStatus) {
    query.status = queryParams.orderStatus
  }
  if (queryParams.keyword) {
    query.keyword = queryParams.keyword
  }
  if (dateRange.value && dateRange.value.length === 2) {
    query.beginTime = dateRange.value[0]
    query.endTime = dateRange.value[1]
  }
  return query
}

const fetchOrders = async () => {
  loading.value = true
  try {
    const query = buildQuery()
    const [tableRes, metricsRes] = await Promise.all([
      listOrders(query),
      getOrderMetrics({ scope: viewScope.value })
    ])
    const rows = Array.isArray(tableRes?.rows) ? tableRes.rows : []
    orderList.value = rows.map(normalizeOrder)
    total.value = typeof tableRes?.total === 'number' ? tableRes.total : rows.length
    buildProjectOptions(rows)
    recalcSummary()
    applyMetrics(metricsRes?.data?.summary || metricsRes?.data)
  } catch (error) {
    console.warn('[order] 获取订单列表失败', error)
    orderList.value = []
    total.value = 0
    summary.pending = 0
    summary.inProgress = 0
    summary.completedToday = 0
    summary.gmv = 0
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNum = 1
  fetchOrders()
}

const resetQuery = () => {
  queryParams.projectCode = ''
  queryParams.orderStatus = ''
  queryParams.keyword = ''
  dateRange.value = []
  queryParams.pageNum = 1
  fetchOrders()
}

const detailVisible = ref(false)
const detailOrder = ref(null)

const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map((item) => item.id)
}

const openDetail = async (row) => {
  detailVisible.value = true
  detailOrder.value = normalizeOrder(row)
  if (!row || !row.id) {
    return
  }
  try {
    const { data } = await getOrder(row.id)
    if (data) {
      detailOrder.value = normalizeOrder(data)
    }
  } catch (error) {
    console.warn('[order] 获取订单详情失败', error)
  }
}

const updateStatus = async (order, status, successMessage) => {
  try {
    await updateOrderStatus(order.id, status)
    ElMessage.success(successMessage)
    fetchOrders()
  } catch (error) {
    console.warn('[order] 更新状态失败', error)
    ElMessage.error('状态更新失败，请稍后重试')
  }
}

const handleAssign = async (order) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入要指派的打手ID', '派单', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: order.boosterId ? String(order.boosterId) : '',
      inputPattern: /^[0-9]+$/,
      inputErrorMessage: '请输入数字ID'
    })
    await assignOrder(order.id, Number(value))
    ElMessage.success('派单指令已发出')
    fetchOrders()
  } catch (error) {
    if (error === 'cancel') {
      return
    }
    console.warn('[order] 派单失败', error)
    ElMessage.error('派单失败，请稍后重试')
  }
}

const handleCancel = (order) => updateStatus(order, 'cancelled', '订单已取消')
const handleComplete = (order) => updateStatus(order, 'completed', '订单已标记完成')
const handlePay = (order) => updateStatus(order, 'confirmed', '支付成功，已通知运营派单')
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
