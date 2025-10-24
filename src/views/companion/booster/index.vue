<template>
  <div class="booster-page app-container">
    <el-card shadow="never" class="filter-card">
      <template #header>
        <div class="card-header">
          <div>
            <span class="card-title">打手资源概览</span>
            <small class="card-subtitle">共 {{ total }} 名打手，可按模式与状态筛选</small>
          </div>
          <el-button type="primary" plain v-if="isManager" @click="handleAdd">
            新增打手
          </el-button>
        </div>
      </template>

      <el-form :model="queryParams" :inline="true" class="filter-form">
        <el-form-item label="关键词">
          <el-input
            v-model="queryParams.keyword"
            placeholder="编号 / 姓名 / 标签"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="计费模式">
          <el-select v-model="queryParams.pricingMode" placeholder="全部模式" clearable>
            <el-option
              v-for="item in pricingOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="全部状态" clearable>
            <el-option
              v-for="item in statusFilters"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
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
        :data="boosterList"
        border
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" align="center" v-if="isManager" />
        <el-table-column label="打手" min-width="180">
          <template #default="scope">
            <div class="booster-cell">
              <el-avatar :size="44">
                {{ scope.row.name.slice(0, 1) }}
              </el-avatar>
              <div class="booster-meta">
                <span class="booster-name">{{ scope.row.name }}</span>
                <span class="booster-tags">
                  <el-tag v-for="tag in scope.row.tags" :key="tag" size="small" type="info">
                    {{ tag }}
                  </el-tag>
                </span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="核心项目" min-width="180">
          <template #default="scope">
            {{ scope.row.games.length ? scope.row.games.join(' · ') : '—' }}
          </template>
        </el-table-column>
        <el-table-column prop="rank" label="段位/段数" min-width="140" />
        <el-table-column label="计费模式" min-width="120">
          <template #default="scope">
            {{ scope.row.pricingModeLabel }}
          </template>
        </el-table-column>
        <el-table-column label="小时价格" min-width="120">
          <template #default="scope">
            <span v-if="scope.row.price > 0">
              {{ formatNumber(scope.row.price, 'currency') }}
            </span>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column prop="ordersThisWeek" label="本周接单" min-width="120" />
        <el-table-column prop="avgResponse" label="平均响应" min-width="120" />
        <el-table-column label="评分" min-width="100">
          <template #default="scope">
            <el-tag type="warning" size="small">
              {{ Number(scope.row.rating || 0).toFixed(1) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="120">
          <template #default="scope">
            <el-tag :type="statusTagType(scope.row.status)">
              {{ statusLabel(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="220" fixed="right">
          <template #default="scope">
            <el-space>
              <el-button link type="primary" @click="openDetail(scope.row)">详情</el-button>
              <el-button
                v-if="isManager"
                link
                type="success"
                @click="handleToggleStatus(scope.row)"
              >
                {{ statusLabel(scope.row.status) === '在线' ? '设为休息' : '设为在线' }}
              </el-button>
              <el-button
                v-if="isManager"
                link
                type="warning"
                @click="handleAssign(scope.row)"
              >
                加入派单池
              </el-button>
              <el-button v-if="isBoss" link type="primary" @click="handleBook(scope.row)">
                立即预约
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
        @pagination="fetchBoosters"
      />
    </el-card>

    <el-drawer
      v-model="detailVisible"
      :title="detailBooster ? `${detailBooster.name} · 档案` : '打手档案'"
      size="420px"
    >
      <div v-if="detailBooster" class="detail-pane">
        <section class="detail-section">
          <h4>基础信息</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="打手编号">
              {{ detailBooster.boosterCode || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="联系方式">
              {{ detailBooster.mobile || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="段位等级">
              {{ detailBooster.rank || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="计费模式">
              {{ detailBooster.pricingModeLabel }}
            </el-descriptions-item>
            <el-descriptions-item label="结算方式">
              {{ detailBooster.settlementLabel }}
            </el-descriptions-item>
            <el-descriptions-item label="结算账号">
              {{ detailBooster.settlementAccount || '—' }}
            </el-descriptions-item>
          </el-descriptions>
        </section>

        <section class="detail-section" v-if="detailBooster.signature || detailBooster.remark">
          <h4>说明</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="个性签名">
              {{ detailBooster.signature || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="内部备注">
              {{ detailBooster.remark || '—' }}
            </el-descriptions-item>
          </el-descriptions>
        </section>

        <section class="detail-section">
          <h4>上架标签</h4>
          <el-space wrap>
            <el-tag v-for="tag in detailBooster.tags" :key="tag" type="info">
              {{ tag }}
            </el-tag>
          </el-space>
        </section>

        <section class="detail-section">
          <h4>本周档期</h4>
          <el-timeline v-if="detailBooster.schedule.length">
            <el-timeline-item
              v-for="slot in detailBooster.schedule"
              :key="slot.day"
              :timestamp="slot.day"
            >
              <el-tag
                v-for="time in slot.slots"
                :key="time"
                type="success"
                size="small"
              >
                {{ time }}
              </el-tag>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无排班信息" />
        </section>
      </div>
      <el-empty v-else description="未选择打手" />
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, reactive, ref, getCurrentInstance } from 'vue'
import { ElMessage } from 'element-plus'
import Pagination from '@/components/Pagination'
import { listBoosters, changeBoosterStatus, getBooster } from '@/api/companion/booster'
import useUserStore from '@/store/modules/user'

const { proxy } = getCurrentInstance() || {}
const dictRefs = proxy?.useDict ? proxy.useDict('companion_service_mode') : {}
const serviceModeDict = dictRefs?.companion_service_mode || ref([])

const loading = ref(false)
const boosterList = ref([])
const total = ref(0)
const pricingOptions = ref([])

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  pricingMode: '',
  status: ''
})

const statusConfig = [
  { value: 'online', label: '在线', tagType: 'success', toggleTarget: 'rest' },
  { value: 'rest', label: '休息', tagType: 'info', toggleTarget: 'online' },
  { value: 'busy', label: '忙碌', tagType: 'warning', toggleTarget: 'online' },
  { value: 'disabled', label: '停用', tagType: 'danger', toggleTarget: 'online' },
  { value: '0', label: '在线', tagType: 'success', toggleTarget: '1', normalized: 'online' },
  { value: '1', label: '休息', tagType: 'info', toggleTarget: '0', normalized: 'rest' }
]

const statusFilters = statusConfig.filter((item) =>
  ['online', 'rest', 'busy', 'disabled'].includes(item.value)
)

const statusMeta = statusConfig.reduce((acc, item) => {
  acc[item.value] = item
  if (item.normalized) {
    acc[item.normalized] = { ...item, value: item.normalized }
  }
  return acc
}, {})

const settlementMeta = {
  bank: '银行卡',
  alipay: '支付宝',
  wechat: '微信',
  other: '其他'
}

const selectedIds = ref([])
const detailVisible = ref(false)
const detailBooster = ref(null)

const userStore = useUserStore()
const roles = computed(() => userStore.roles || [])

const isManager = computed(() => roles.value.includes('manager') || roles.value.includes('admin'))
const isBoss = computed(() => roles.value.includes('boss'))

const serviceModeLabel = (value) => {
  const dict = serviceModeDict.value || []
  const target = dict.find((item) => item.value === value)
  return target ? target.label : value || '未设置'
}

const settlementLabel = (value) => settlementMeta[value] || value || '未设置'

const normalizeList = (value) => {
  if (!value) {
    return []
  }
  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }
  return String(value)
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const parseSchedule = (calendarJson) => {
  if (!calendarJson) {
    return []
  }
  try {
    const data = JSON.parse(calendarJson)
    if (Array.isArray(data)) {
      return data.map((item, index) => ({
        day: item.day || item.label || `档期${index + 1}`,
        slots: normalizeList(item.slots)
      }))
    }
    if (typeof data === 'object') {
      return Object.entries(data).map(([day, slots]) => ({
        day,
        slots: normalizeList(slots)
      }))
    }
  } catch (error) {
    console.warn('[booster] calendarJson 解析失败', error)
  }
  return []
}

const normalizeBooster = (item = {}) => {
  const tags = normalizeList(item.skillTags)
  const games = normalizeList(item.skillTags || item.pricingMode)
  const rank = item.levelDesc || '—'
  const price = Number(item.unitPrice ?? item.defaultRate ?? 0)
  const rating = Number(item.rating ?? 0) || 5
  const avgResponse = item.avgResponse || '—'
  const successRate = item.successRate ?? '--'
  const status = item.status ?? 'online'
  return {
    ...item,
    name: item.realName || item.boosterCode || '未命名',
    games,
    tags,
    rank,
    price,
    ordersThisWeek: item.ordersThisWeek ?? 0,
    avgResponse,
    rating,
    successRate,
    pricingModeLabel: serviceModeLabel(item.pricingMode),
    settlementLabel: settlementLabel(item.settlementType),
    schedule: parseSchedule(item.calendarJson),
    status
  }
}

const buildPricingOptions = (rows = []) => {
  const seen = new Set()
  const options = []
  rows.forEach((item) => {
    if (!item.pricingMode || seen.has(item.pricingMode)) {
      return
    }
    seen.add(item.pricingMode)
    options.push({
      value: item.pricingMode,
      label: serviceModeLabel(item.pricingMode)
    })
  })
  pricingOptions.value = options
}

const formatNumber = (value, format) => {
  const number = Number(value || 0)
  if (format === 'currency') {
    return `¥${number.toLocaleString('zh-CN', { minimumFractionDigits: 0 })}`
  }
  return number.toLocaleString('zh-CN')
}

const statusLabel = (status) => statusMeta[status]?.label || status
const statusTagType = (status) => statusMeta[status]?.tagType || 'info'

const buildQuery = () => {
  const query = {
    pageNum: queryParams.pageNum,
    pageSize: queryParams.pageSize
  }
  if (queryParams.keyword) {
    query.keyword = queryParams.keyword
  }
  if (queryParams.pricingMode) {
    query.pricingMode = queryParams.pricingMode
  }
  if (queryParams.status) {
    query.status = queryParams.status
  }
  return query
}

const fetchBoosters = async () => {
  loading.value = true
  try {
    const { rows = [], total: count } = await listBoosters(buildQuery())
    boosterList.value = rows.map(normalizeBooster)
    total.value = typeof count === 'number' ? count : boosterList.value.length
    buildPricingOptions(rows)
  } catch (error) {
    console.warn('[booster] 获取打手列表失败', error)
    boosterList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNum = 1
  fetchBoosters()
}

const resetQuery = () => {
  queryParams.keyword = ''
  queryParams.pricingMode = ''
  queryParams.status = ''
  queryParams.pageNum = 1
  fetchBoosters()
}

const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map((item) => item.boosterId)
}

const openDetail = async (row) => {
  detailVisible.value = true
  detailBooster.value = normalizeBooster(row)
  if (!row || !row.boosterId) {
    return
  }
  try {
    const { data } = await getBooster(row.boosterId)
    if (data) {
      detailBooster.value = normalizeBooster(data)
    }
  } catch (error) {
    console.warn('[booster] 获取打手详情失败', error)
  }
}

const handleAdd = () => {
  ElMessage.info('请在后端配置打手信息表单后，再做新增操作')
}

const handleAssign = (row) => {
  ElMessage.success(`已将 ${row.name} 加入派单池`)
}

const handleBook = (row) => {
  ElMessage.success(`预约需求已提交，运营会尽快联系 ${row.name}`)
}

const handleToggleStatus = async (row) => {
  const meta = statusMeta[row.status] || statusMeta[row.normalizedStatus]
  if (!meta || !meta.toggleTarget) {
    ElMessage.warning('当前状态不支持切换')
    return
  }
  const nextStatus = meta.toggleTarget
  try {
    await changeBoosterStatus(row.boosterId, nextStatus)
    ElMessage.success('状态已更新')
    fetchBoosters()
  } catch (error) {
    console.warn('[booster] 更新状态失败', error)
    ElMessage.error('状态更新失败，请稍后重试')
  }
}

fetchBoosters()
</script>

<style scoped lang="scss">
.booster-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .card-title {
    font-weight: 600;
    font-size: 16px;
    margin-right: 12px;
  }

  .card-subtitle {
    color: #909399;
  }
}

.filter-form .el-form-item {
  margin-bottom: 0;
}

.booster-cell {
  display: flex;
  align-items: center;
  gap: 12px;

  .booster-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .booster-name {
    font-weight: 600;
    color: #1f2f3d;
  }

  .booster-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
}

.detail-pane {
  display: flex;
  flex-direction: column;
  gap: 18px;

  .detail-section {
    h4 {
      margin: 0 0 12px;
      font-weight: 600;
      color: #303133;
    }
  }
}
</style>

