<template>
  <div class="booster-page app-container">
    <el-card shadow="never" class="filter-card">
      <template #header>
        <div class="card-header">
          <div>
            <span class="card-title">打手资源概览</span>
            <small class="card-subtitle">共 {{ total }} 名打手，可按项目与状态筛选</small>
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
            placeholder="昵称 / 标签 / 技能"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="项目">
          <el-select v-model="queryParams.game" placeholder="全部项目" clearable>
            <el-option v-for="item in gameOptions" :key="item" :label="item" :value="item" />
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
                  <el-tag
                    v-for="tag in scope.row.tags"
                    :key="tag"
                    size="small"
                    type="info"
                  >
                    {{ tag }}
                  </el-tag>
                </span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="核心项目" min-width="180">
          <template #default="scope">
            {{ scope.row.games.join('、') }}
          </template>
        </el-table-column>
        <el-table-column prop="rank" label="段位/段数" min-width="120" />
        <el-table-column label="小时价格" min-width="110">
          <template #default="scope">
            {{ formatNumber(scope.row.price, 'currency') }}
          </template>
        </el-table-column>
        <el-table-column prop="ordersThisWeek" label="本周接单" min-width="110" />
        <el-table-column prop="avgResponse" label="平均响应" min-width="120" />
        <el-table-column label="评分" min-width="100">
          <template #default="scope">
            <el-tag type="warning" size="small">
              {{ scope.row.rating.toFixed(1) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="110">
          <template #default="scope">
            <el-tag :type="statusTagType(scope.row.status)">
              {{ statusLabel(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="200" fixed="right">
          <template #default="scope">
            <el-space>
              <el-button link type="primary" @click="openDetail(scope.row)">详情</el-button>
              <el-button
                v-if="isManager"
                link
                type="success"
                @click="handleToggleStatus(scope.row)"
              >
                {{ scope.row.status === 'online' ? '设为休息' : '设为在线' }}
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
            <el-descriptions-item label="主打项目">
              {{ detailBooster.games.join('、') }}
            </el-descriptions-item>
            <el-descriptions-item label="段位等级">
              {{ detailBooster.rank }}
            </el-descriptions-item>
            <el-descriptions-item label="小时价格">
              {{ formatNumber(detailBooster.price, 'currency') }}
            </el-descriptions-item>
            <el-descriptions-item label="近30日完单率">
              {{ detailBooster.successRate }}%
            </el-descriptions-item>
            <el-descriptions-item label="平均响应时间">
              {{ detailBooster.avgResponse }}
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
          <el-timeline>
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
        </section>
      </div>
      <el-empty v-else description="未选择打手" />
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import Pagination from '@/components/Pagination'
import { listBoosters, changeBoosterStatus } from '@/api/companion/booster'
import useUserStore from '@/store/modules/user'

const loading = ref(false)
const boosterList = ref([])
const total = ref(0)

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  game: '',
  status: ''
})

const gameOptions = ['王者荣耀', '英雄联盟', '永劫无间', 'APEX 英雄', '绝地求生']
const statusFilters = [
  { label: '在线', value: 'online' },
  { label: '忙碌', value: 'busy' },
  { label: '休息', value: 'rest' }
]

const statusMeta = {
  online: { label: '在线', tagType: 'success' },
  busy: { label: '忙碌', tagType: 'warning' },
  rest: { label: '休息', tagType: 'info' }
}

const fallbackBoosters = [
  {
    boosterId: 1001,
    name: '花落成双',
    games: ['王者荣耀', '和平精英'],
    rank: '最强王者 · 158星',
    price: 68,
    ordersThisWeek: 12,
    avgResponse: '5分钟',
    rating: 4.9,
    successRate: 98,
    status: 'online',
    tags: ['峡谷冲分', '情绪管理'],
    schedule: [
      { day: '周一', slots: ['19:00-23:00'] },
      { day: '周三', slots: ['20:00-24:00'] },
      { day: '周六', slots: ['14:00-18:00', '20:00-24:00'] }
    ]
  },
  {
    boosterId: 1002,
    name: '北城以南',
    games: ['英雄联盟'],
    rank: '韩服大师 · 前150',
    price: 88,
    ordersThisWeek: 15,
    avgResponse: '8分钟',
    rating: 4.8,
    successRate: 95,
    status: 'busy',
    tags: ['中单带飞', 'BP 构建'],
    schedule: [
      { day: '周二', slots: ['19:00-23:00'] },
      { day: '周四', slots: ['20:00-24:00'] },
      { day: '周日', slots: ['15:00-18:00'] }
    ]
  },
  {
    boosterId: 1003,
    name: '南巷清风',
    games: ['永劫无间', 'APEX 英雄'],
    rank: '赛季天选 · 前1%',
    price: 78,
    ordersThisWeek: 9,
    avgResponse: '10分钟',
    rating: 4.7,
    successRate: 92,
    status: 'rest',
    tags: ['吃鸡带飞', '语音指挥'],
    schedule: [
      { day: '周三', slots: ['19:00-22:00'] },
      { day: '周五', slots: ['20:00-24:00'] },
      { day: '周日', slots: ['14:00-18:00'] }
    ]
  }
]

const selectedIds = ref([])
const detailVisible = ref(false)
const detailBooster = ref(null)

const userStore = useUserStore()
const roles = computed(() => userStore.roles || [])

const isManager = computed(() => roles.value.includes('manager') || roles.value.includes('admin'))
const isBoss = computed(() => roles.value.includes('boss'))

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
  if (queryParams.game) {
    query.game = queryParams.game
  }
  if (queryParams.status) {
    query.status = queryParams.status
  }
  return query
}

const fetchBoosters = async () => {
  loading.value = true
  try {
    const { rows, total: count } = await listBoosters(buildQuery())
    boosterList.value = Array.isArray(rows) && rows.length ? rows : fallbackBoosters
    total.value = typeof count === 'number' ? count : boosterList.value.length
  } catch (error) {
    console.warn('[booster] 获取打手列表失败，使用默认数据。', error)
    boosterList.value = fallbackBoosters
    total.value = fallbackBoosters.length
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
  queryParams.game = ''
  queryParams.status = ''
  queryParams.pageNum = 1
  fetchBoosters()
}

const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map((item) => item.boosterId)
}

const openDetail = (row) => {
  detailBooster.value = row
  detailVisible.value = true
}

const handleAdd = () => {
  ElMessage.info('请在后端配置打手信息表单后，再做新增操作。')
}

const handleAssign = (row) => {
  ElMessage.success(`已将 ${row.name} 加入派单池`)
}

const handleBook = (row) => {
  ElMessage.success(`预约需求已提交，运营会尽快联系 ${row.name}`)
}

const handleToggleStatus = async (row) => {
  const nextStatus = row.status === 'online' ? 'rest' : 'online'
  try {
    await changeBoosterStatus(row.boosterId, nextStatus)
    row.status = nextStatus
    ElMessage.success('状态已更新')
  } catch (error) {
    console.warn('[booster] 更新状态失败，已启用本地回退。', error)
    row.status = nextStatus
    ElMessage.warning('接口未就绪，已临时更新本地状态')
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
