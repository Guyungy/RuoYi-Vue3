<template>
  <div class="boss-page app-container">
    <el-card shadow="never" class="filter-card">
      <template #header>
        <div class="card-header">
          <div>
            <span class="card-title">老板资源库</span>
            <small class="card-subtitle">快速查询老板画像与联系方式</small>
          </div>
          <el-space wrap>
            <el-button type="primary" plain v-if="isManager" @click="handleAdd">
              新增老板
            </el-button>
            <el-button
              type="success"
              plain
              :disabled="!selection.length"
              v-if="isManager"
              @click="handleBatchExport"
            >
              批量导出
            </el-button>
          </el-space>
        </div>
      </template>

      <el-form :model="queryParams" :inline="true" class="filter-form">
        <el-form-item label="关键字">
          <el-input
            v-model="queryParams.keyword"
            placeholder="编号 / 名称 / 联系人"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="等级">
          <el-select v-model="queryParams.level" placeholder="全部等级" clearable>
            <el-option v-for="item in levelFilters" :key="item.value" :label="item.label" :value="item.value" />
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
        :data="bossList"
        border
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" align="center" v-if="isManager" />
        <el-table-column label="老板" min-width="200">
          <template #default="scope">
            <div class="boss-cell">
              <el-avatar :size="44">{{ scope.row.bossName?.slice(0, 1) }}</el-avatar>
              <div class="boss-meta">
                <span class="boss-name">
                  {{ scope.row.bossName }}
                  <el-tag size="small" type="warning" v-if="scope.row.level">
                    {{ levelLabel(scope.row.level) }}
                  </el-tag>
                </span>
                <small class="boss-code">编号：{{ scope.row.bossCode || '—' }}</small>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="contactName" label="联系人" min-width="140" />
        <el-table-column prop="mobile" label="手机" min-width="140" />
        <el-table-column prop="wechat" label="微信" min-width="140" />
        <el-table-column prop="favoriteGames" label="偏好项目" min-width="180" show-overflow-tooltip />
        <el-table-column prop="invoiceTitle" label="开票抬头" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="scope">
            <el-space>
              <el-button link type="primary" @click="openDetail(scope.row)">详情</el-button>
              <el-button link type="success" v-if="isManager" @click="handleEdit(scope.row)">编辑</el-button>
              <el-popconfirm
                v-if="isManager"
                title="确认删除该老板？"
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
        v-if="total > 0"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        :total="total"
        @pagination="fetchBosses"
      />
    </el-card>

    <el-dialog v-model="detailVisible" title="老板详情" width="640px">
      <el-descriptions :column="2" border class="detail-pane">
        <el-descriptions-item label="编号">{{ detailBoss.bossCode || '—' }}</el-descriptions-item>
        <el-descriptions-item label="等级">
          <el-tag size="small" type="warning" v-if="detailBoss.level">
            {{ levelLabel(detailBoss.level) }}
          </el-tag>
          <span v-else>—</span>
        </el-descriptions-item>
        <el-descriptions-item label="老板昵称">{{ detailBoss.bossName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{ detailBoss.contactName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="手机">{{ detailBoss.mobile || '—' }}</el-descriptions-item>
        <el-descriptions-item label="微信">{{ detailBoss.wechat || '—' }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ detailBoss.email || '—' }}</el-descriptions-item>
        <el-descriptions-item label="地址">{{ detailBoss.address || '—' }}</el-descriptions-item>
      </el-descriptions>

      <el-descriptions :column="1" border class="detail-pane mt16">
        <el-descriptions-item label="偏好项目">
          {{ detailBoss.favoriteGames || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="开票抬头">
          {{ detailBoss.invoiceTitle || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="备注">
          {{ detailBoss.remark || '—' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <el-dialog
      v-model="formVisible"
      :title="formModel.bossId ? '编辑老板' : '新增老板'"
      width="720px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="formModel" :rules="rules" label-width="120px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="老板昵称" prop="bossName">
              <el-input v-model="formModel.bossName" placeholder="请输入老板昵称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="编号" prop="bossCode">
              <el-input v-model="formModel.bossCode" placeholder="系统自动生成可留空" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系人">
              <el-input v-model="formModel.contactName" placeholder="请输入联系人姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="等级">
              <el-select v-model="formModel.level" placeholder="请选择等级" clearable>
                <el-option v-for="item in levelFilters" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机" prop="mobile">
              <el-input v-model="formModel.mobile" placeholder="请输入手机号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="微信">
              <el-input v-model="formModel.wechat" placeholder="请输入微信号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱">
              <el-input v-model="formModel.email" placeholder="请输入邮箱" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="常玩游戏">
              <el-input v-model="formModel.favoriteGames" placeholder="如：王者荣耀、LOL" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="开票抬头">
              <el-input v-model="formModel.invoiceTitle" placeholder="可选填" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="税号">
              <el-input v-model="formModel.taxNo" placeholder="可选填" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="地址">
              <el-input v-model="formModel.address" placeholder="可选填" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="formModel.remark" type="textarea" :rows="3" placeholder="补充客户需求、沟通记录等" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取 消</el-button>
        <el-button type="primary" :loading="formLoading" @click="handleSubmit">保 存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import Pagination from '@/components/Pagination'
import useUserStore from '@/store/modules/user'
import { listBosses, getBoss, addBoss, updateBoss, removeBoss } from '@/api/companion/boss'

const userStore = useUserStore()
const roles = computed(() => userStore.roles || [])
const isManager = computed(() => roles.value.includes('manager') || roles.value.includes('admin'))

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  level: ''
})

const bossList = ref([])
const total = ref(0)
const loading = ref(false)
const selection = ref([])
const detailVisible = ref(false)
const detailBoss = ref({})
const formVisible = ref(false)
const formLoading = ref(false)
const formRef = ref(null)
const formModel = reactive(createFormModel())

const levelFilters = [
  { label: '星耀老板', value: 'vip' },
  { label: '黄金老板', value: 'gold' },
  { label: '白银老板', value: 'silver' },
  { label: '普通老板', value: 'standard' }
]

function levelLabel(val) {
  const target = levelFilters.find((item) => item.value === val)
  return target ? target.label : val
}

function createFormModel() {
  return {
    bossId: null,
    bossCode: '',
    bossName: '',
    contactName: '',
    mobile: '',
    wechat: '',
    email: '',
    level: '',
    favoriteGames: '',
    invoiceTitle: '',
    taxNo: '',
    address: '',
    remark: ''
  }
}

const rules = {
  bossName: [{ required: true, message: '请输入老板昵称', trigger: 'blur' }],
  mobile: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ]
}

const fetchBosses = async () => {
  loading.value = true
  try {
    const { data } = await listBosses(queryParams)
    bossList.value = data.rows || data || []
    total.value = data.total || data.count || 0
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNum = 1
  fetchBosses()
}

const resetQuery = () => {
  queryParams.keyword = ''
  queryParams.level = ''
  queryParams.pageNum = 1
  fetchBosses()
}

const handleSelectionChange = (rows) => {
  selection.value = rows
}

const openDetail = async (row) => {
  const target = row?.bossId
  if (!target) {
    detailBoss.value = row
    detailVisible.value = true
    return
  }
  const { data } = await getBoss(target)
  detailBoss.value = data || {}
  detailVisible.value = true
}

const handleAdd = () => {
  Object.assign(formModel, createFormModel())
  formVisible.value = true
}

const handleEdit = async (row) => {
  if (!row?.bossId) {
    return
  }
  const { data } = await getBoss(row.bossId)
  Object.assign(formModel, createFormModel(), data || row)
  formVisible.value = true
}

const handleSubmit = () => {
  if (!formRef.value) return
  formRef.value.validate(async (valid) => {
    if (!valid) return
    formLoading.value = true
    try {
      const payload = { ...formModel }
      if (payload.bossId) {
        await updateBoss(payload)
      } else {
        await addBoss(payload)
      }
      ElMessage.success('保存成功')
      formVisible.value = false
      fetchBosses()
    } finally {
      formLoading.value = false
    }
  })
}

const handleDelete = async (row) => {
  await removeBoss([row.bossId])
  ElMessage.success('删除成功')
  fetchBosses()
}

const handleBatchExport = () => {
  const ids = selection.value.map((item) => item.bossId)
  ElMessage.info(`导出 ${ids.length} 条老板资料（开发中）`)
}

fetchBosses()
</script>

<style scoped lang="scss">
.boss-page {
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

.boss-cell {
  display: flex;
  align-items: center;
  gap: 12px;

  .boss-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .boss-code {
    color: #909399;
  }

  .boss-name {
    font-weight: 600;
    color: #1f2f3d;
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.detail-pane {
  margin-top: 12px;
}

.mt16 {
  margin-top: 16px;
}
</style>
