<template>
  <div class="booster-page app-container">
    <el-card shadow="never" class="filter-card">
      <template #header>
        <div class="card-header">
          <div>
            <span class="card-title">打手资源概览</span>
            <small class="card-subtitle">共 {{ total }} 名打手，可按模式与状态筛选</small>
          </div>
          <el-space v-if="isManager" wrap>
            <el-button type="primary" plain @click="handleAdd">新增打手</el-button>
            <el-button type="danger" plain :disabled="!selectedIds.length" @click="handleBatchDelete">
              批量删除
            </el-button>
          </el-space>
        </div>
      </template>

      <el-form :model="queryParams" :inline="true" class="filter-form">
        <el-form-item label="关键字">
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
              v-for="item in pricingSelectOptions"
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
        <el-table-column label="打手" min-width="200">
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
        <el-table-column prop="rank" label="段位/段数" min-width="120" />
        <el-table-column label="计费模式" min-width="130">
          <template #default="scope">
            {{ scope.row.pricingModeLabel }}
          </template>
        </el-table-column>
        <el-table-column label="小时价格" min-width="120">
          <template #default="scope">
            <span v-if="scope.row.price > 0">{{ formatNumber(scope.row.price, 'currency') }}</span>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column prop="ordersThisWeek" label="本周接单" min-width="120" />
        <el-table-column prop="avgResponse" label="平均响应" min-width="120" />
        <el-table-column label="评分" min-width="110">
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
        <el-table-column label="操作" min-width="320" fixed="right">
          <template #default="scope">
            <el-space wrap>
              <el-button link type="primary" @click="openDetail(scope.row)">详情</el-button>
              <el-button v-if="isManager" link type="primary" @click="handleEdit(scope.row)">编辑</el-button>
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
              <el-popconfirm v-if="isManager" title="确认删除该打手？" @confirm="handleDelete(scope.row)">
                <template #reference>
                  <el-button link type="danger">删除</el-button>
                </template>
              </el-popconfirm>
              <el-button v-if="isBoss" link type="primary" @click="handleBook(scope.row)">
                立即预约
              </el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>
      <Pagination
        v-if="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        :total="total"
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
            <el-descriptions-item label="打手编号">{{ detailBooster.boosterCode || '—' }}</el-descriptions-item>
            <el-descriptions-item label="联系方式">{{ detailBooster.mobile || '—' }}</el-descriptions-item>
            <el-descriptions-item label="段位等级">{{ detailBooster.rank || '—' }}</el-descriptions-item>
            <el-descriptions-item label="计费模式">{{ detailBooster.pricingModeLabel }}</el-descriptions-item>
            <el-descriptions-item label="结算方式">{{ detailBooster.settlementLabel }}</el-descriptions-item>
            <el-descriptions-item label="结算账号">{{ detailBooster.settlementAccount || '—' }}</el-descriptions-item>
          </el-descriptions>
        </section>

        <section class="detail-section" v-if="detailBooster.signature || detailBooster.remark">
          <h4>说明</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="个性签名">{{ detailBooster.signature || '—' }}</el-descriptions-item>
            <el-descriptions-item label="内部备注">{{ detailBooster.remark || '—' }}</el-descriptions-item>
          </el-descriptions>
        </section>

        <section class="detail-section">
          <h4>上架标签</h4>
          <el-space wrap>
            <el-tag v-for="tag in detailBooster.tags" :key="tag" type="info">{{ tag }}</el-tag>
          </el-space>
        </section>

        <section class="detail-section">
          <h4>本周档期</h4>
          <el-timeline v-if="detailBooster.schedule.length">
            <el-timeline-item v-for="slot in detailBooster.schedule" :key="slot.day" :timestamp="slot.day">
              <el-tag v-for="time in slot.slots" :key="time" type="success" size="small">{{ time }}</el-tag>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无排班信息" />
        </section>
      </div>
      <el-empty v-else description="未选择打手" />
    </el-drawer>

    <el-dialog v-model="formVisible" :title="formModel.boosterId ? '编辑打手' : '新增打手'" width="720px" destroy-on-close>
      <el-form ref="formRef" :model="formModel" :rules="formRules" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="真实姓名" prop="realName">
              <el-input v-model="formModel.realName" placeholder="请输入真实姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="打手编号">
              <el-input v-model="formModel.boosterCode" placeholder="留空自动生成" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="mobile">
              <el-input v-model="formModel.mobile" placeholder="请输入手机号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别">
              <el-select v-model="formModel.gender" placeholder="请选择">
                <el-option v-for="item in genderOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="计费模式" prop="pricingMode">
              <el-select
                v-model="formModel.pricingMode"
                placeholder="请选择计费模式"
                filterable
                allow-create
                default-first-option
              >
                <el-option v-for="item in pricingSelectOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="当前状态" prop="status">
              <el-select v-model="formModel.status" placeholder="请选择状态">
                <el-option v-for="item in statusFilters" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="技能标签">
              <el-select
                v-model="formModel.skillTags"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="输入后回车即可新增标签"
              >
                <el-option v-for="tag in skillTagOptions" :key="tag.value" :label="tag.label" :value="tag.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="段位/描述">
              <el-input v-model="formModel.levelDesc" placeholder="例如 王者50星" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结算方式" prop="settlementType">
              <el-select v-model="formModel.settlementType" placeholder="请选择结算方式">
                <el-option v-for="item in settlementOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="结算账号">
              <el-input v-model="formModel.settlementAccount" placeholder="请输入结算账号" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="个性签名">
              <el-input v-model="formModel.signature" placeholder="一句话介绍自己" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="档期JSON">
              <el-input v-model="formModel.calendarJson" type="textarea" :rows="3" placeholder='[{"day":"周五","slots":["19:00-22:00"]}]' />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="内部备注">
              <el-input v-model="formModel.remark" type="textarea" :rows="3" placeholder="补充注意事项、擅长项目等" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取 消</el-button>
        <el-button type="primary" :loading="formLoading" @click="submitForm">保 存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, getCurrentInstance } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import Pagination from '@/components/Pagination'
import {
  listBoosters,
  changeBoosterStatus,
  getBooster,
  addBooster,
  updateBooster,
  removeBooster
} from '@/api/companion/booster'
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

const userStore = useUserStore()
const roles = computed(() => userStore.roles || [])
const isManager = computed(() => roles.value.includes('manager') || roles.value.includes('admin'))
const isBoss = computed(() => roles.value.includes('boss'))

const statusConfig = [
  { value: 'online', label: '在线', tagType: 'success', toggleTarget: 'rest' },
  { value: 'rest', label: '休息', tagType: 'info', toggleTarget: 'online' },
  { value: 'busy', label: '忙碌', tagType: 'warning', toggleTarget: 'online' },
  { value: 'disabled', label: '停用', tagType: 'danger', toggleTarget: 'online' },
  { value: '0', label: '在线', tagType: 'success', toggleTarget: '1', normalized: 'online' },
  { value: '1', label: '休息', tagType: 'info', toggleTarget: '0', normalized: 'rest' }
]

const statusFilters = statusConfig.filter((item) => ['online', 'rest', 'busy', 'disabled'].includes(item.value))

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

const genderOptions = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
  { label: '未知', value: 'unknown' }
]

const settlementOptions = Object.entries(settlementMeta).map(([value, label]) => ({ value, label }))
const skillTagOptions = ref([])
const selectedIds = ref([])
const detailVisible = ref(false)
const detailBooster = ref(null)

const formVisible = ref(false)
const formLoading = ref(false)
const formRef = ref(null)
const formModel = reactive(createFormModel())

const formRules = {
  realName: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  mobile: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  pricingMode: [{ required: true, message: '请选择计费模式', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  settlementType: [{ required: true, message: '请选择结算方式', trigger: 'change' }]
}

const pricingSelectOptions = computed(() => {
  if (pricingOptions.value.length) {
    return pricingOptions.value
  }
  const dict = serviceModeDict.value || []
  return dict.map((item) => ({ value: item.value, label: item.label }))
})

const serviceModeLabel = (value) => {
  const dict = serviceModeDict.value || []
  const target = dict.find((item) => item.value === value)
  return target ? target.label : value || '未设置'
}

const settlementLabel = (value) => settlementMeta[value] || value || '未设置'
const statusLabel = (value) => statusMeta[value]?.label || value || '未知'
const statusTagType = (value) => statusMeta[value]?.tagType || 'info'

const formatNumber = (value, format) => {
  const number = Number(value || 0)
  if (format === 'currency') {
    return `¥${number.toLocaleString('zh-CN', { minimumFractionDigits: 0 })}`
  }
  return number.toLocaleString('zh-CN')
}

function createFormModel() {
  return {
    boosterId: null,
    boosterCode: '',
    realName: '',
    mobile: '',
    gender: 'unknown',
    pricingMode: '',
    status: 'online',
    skillTags: [],
    levelDesc: '',
    settlementType: '',
    settlementAccount: '',
    signature: '',
    calendarJson: '',
    remark: ''
  }
}

const normalizeList = (value) => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }
  return String(value)
    .split(/[,，;；\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const parseSchedule = (value) => {
  if (!value) return []
  try {
    const data = typeof value === 'string' ? JSON.parse(value) : value
    if (Array.isArray(data)) {
      return data.map((item, index) => ({
        day: item.day || item.label || `档期${index + 1}`,
        slots: normalizeList(item.slots)
      }))
    }
  } catch (error) {
    console.warn('[booster] 解析档期失败', error)
  }
  return []
}

const normalizeBooster = (item = {}) => {
  const tags = normalizeList(item.skillTags)
  const games = normalizeList(item.favoriteGames || item.projects || item.skillTags)
  const rank = item.levelDesc || '—'
  const price = Number(item.unitPrice ?? item.defaultRate ?? 0)
  const rating = Number(item.rating ?? 5) || 5
  const status = item.status ?? 'online'
  return {
    ...item,
    name: item.realName || item.boosterCode || '未命名打手',
    tags,
    games,
    rank,
    price,
    rating,
    ordersThisWeek: item.ordersThisWeek ?? '—',
    avgResponse: item.avgResponse ?? '—',
    pricingModeLabel: serviceModeLabel(item.pricingMode),
    settlementLabel: settlementLabel(item.settlementType),
    schedule: parseSchedule(item.calendarJson || item.scheduleJson || '[]'),
    normalizedStatus: status
  }
}

const buildPricingOptions = (rows = []) => {
  const seen = new Set()
  const options = []
  rows.forEach((item) => {
    if (!item.pricingMode || seen.has(item.pricingMode)) return
    seen.add(item.pricingMode)
    options.push({ value: item.pricingMode, label: serviceModeLabel(item.pricingMode) })
  })
  pricingOptions.value = options
}

const buildSkillOptions = (rows = []) => {
  const map = new Map()
  rows.forEach((item) => {
    normalizeList(item.skillTags).forEach((tag) => {
      if (!map.has(tag)) {
        map.set(tag, tag)
      }
    })
  })
  skillTagOptions.value = Array.from(map.values()).map((tag) => ({ value: tag, label: tag }))
}

const buildQuery = () => ({
  pageNum: queryParams.pageNum,
  pageSize: queryParams.pageSize,
  keyword: queryParams.keyword || undefined,
  pricingMode: queryParams.pricingMode || undefined,
  status: queryParams.status || undefined
})

const fetchBoosters = async () => {
  loading.value = true
  try {
    const res = await listBoosters(buildQuery())
    const rows = Array.isArray(res?.rows) ? res.rows : Array.isArray(res?.data?.rows) ? res.data.rows : Array.isArray(res) ? res : []
    const count = typeof res?.total === 'number' ? res.total : typeof res?.data?.total === 'number' ? res.data.total : rows.length
    boosterList.value = rows.map(normalizeBooster)
    total.value = count
    buildPricingOptions(rows)
    buildSkillOptions(rows)
    selectedIds.value = []
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
  Object.assign(formModel, createFormModel())
  formVisible.value = true
}

const handleEdit = async (row) => {
  if (!row || !row.boosterId) {
    return
  }
  try {
    const { data } = await getBooster(row.boosterId)
    fillForm(data || row)
    formVisible.value = true
  } catch (error) {
    console.warn('[booster] 获取打手信息失败', error)
  }
}

const fillForm = (data = {}) => {
  Object.assign(formModel, createFormModel(), {
    ...data,
    skillTags: normalizeList(data.skillTags || data.tags),
    calendarJson: data.calendarJson ? (typeof data.calendarJson === 'string' ? data.calendarJson : JSON.stringify(data.calendarJson, null, 2)) : ''
  })
}

const serializeTags = (tags) => (Array.isArray(tags) ? tags.filter(Boolean).join(',') : tags || '')

const submitForm = () => {
  if (!formRef.value) return
  formRef.value.validate(async (valid) => {
    if (!valid) return
    formLoading.value = true
    try {
      const payload = {
        ...formModel,
        skillTags: serializeTags(formModel.skillTags),
        calendarJson: formModel.calendarJson?.trim() || ''
      }
      if (payload.boosterId) {
        await updateBooster(payload)
      } else {
        await addBooster(payload)
      }
      ElMessage.success('保存成功')
      formVisible.value = false
      fetchBoosters()
    } catch (error) {
      console.warn('[booster] 保存失败', error)
    } finally {
      formLoading.value = false
    }
  })
}

const handleDelete = async (row) => {
  if (!row || !row.boosterId) return
  try {
    await removeBooster([row.boosterId])
    ElMessage.success('删除成功')
    fetchBoosters()
  } catch (error) {
    console.warn('[booster] 删除失败', error)
  }
}

const handleBatchDelete = async () => {
  if (!selectedIds.value.length) return
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 名打手吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await removeBooster(selectedIds.value)
    ElMessage.success('批量删除成功')
    fetchBoosters()
  } catch (error) {
    if (error === 'cancel') {
      return
    }
    console.warn('[booster] 批量删除失败', error)
  }
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
  try {
    await changeBoosterStatus(row.boosterId, meta.toggleTarget)
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
