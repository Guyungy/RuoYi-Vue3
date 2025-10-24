<template>
  <div class="register">
    <el-form ref="registerRef" :model="registerForm" :rules="registerRules" class="register-form">
      <h3 class="title">{{ title }}</h3>
      <p class="subtitle">提交注册后将由运营审核角色身份并发放权限</p>
      <el-form-item prop="username">
        <el-input
          v-model="registerForm.username"
          type="text"
          size="large"
          auto-complete="off"
          placeholder="登录账号"
        >
          <template #prefix>
            <svg-icon icon-class="user" class="el-input__icon input-icon" />
          </template>
        </el-input>
      </el-form-item>
      <el-form-item prop="password">
        <el-input
          v-model="registerForm.password"
          type="password"
          size="large"
          auto-complete="off"
          placeholder="登录密码"
          @keyup.enter="handleRegister"
        >
          <template #prefix>
            <svg-icon icon-class="password" class="el-input__icon input-icon" />
          </template>
        </el-input>
      </el-form-item>
      <el-form-item prop="confirmPassword">
        <el-input
          v-model="registerForm.confirmPassword"
          type="password"
          size="large"
          auto-complete="off"
          placeholder="确认密码"
          @keyup.enter="handleRegister"
        >
          <template #prefix>
            <svg-icon icon-class="password" class="el-input__icon input-icon" />
          </template>
        </el-input>
      </el-form-item>
      <el-form-item prop="code" v-if="captchaEnabled">
        <el-input
          v-model="registerForm.code"
          size="large"
          auto-complete="off"
          placeholder="验证码"
          style="width: 63%"
          @keyup.enter="handleRegister"
        >
          <template #prefix>
            <svg-icon icon-class="validCode" class="el-input__icon input-icon" />
          </template>
        </el-input>
        <div class="register-code">
          <img :src="codeUrl" @click="getCode" class="register-code-img" />
        </div>
      </el-form-item>
      <el-form-item style="width:100%;">
        <el-button
          :loading="loading"
          size="large"
          type="primary"
          style="width:100%;"
          @click.prevent="handleRegister"
        >
          <span v-if="!loading">提交注册</span>
          <span v-else>提交中...</span>
        </el-button>
        <div style="float: right;">
          <router-link class="link-type" :to="'/login'">返回登录</router-link>
        </div>
      </el-form-item>
      <el-alert type="warning" :closable="false" class="tips">
        注册成功后默认为游客权限，请联系运营在后台分配“老板”或“打手”角色。
      </el-alert>
    </el-form>
    <div class="el-register-footer">
      <span>Copyright © 2025 PlayOps. All Rights Reserved.</span>
    </div>
  </div>
</template>

<script setup>
import { ElMessageBox } from 'element-plus'
import { getCodeImg, register } from '@/api/login'

const title = `${import.meta.env.VITE_APP_TITLE} · 注册`
const router = useRouter()
const { proxy } = getCurrentInstance()

const registerForm = ref({
  username: '',
  password: '',
  confirmPassword: '',
  code: '',
  uuid: ''
})

const equalToPassword = (rule, value, callback) => {
  if (registerForm.value.password !== value) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const registerRules = {
  username: [
    { required: true, trigger: 'blur', message: '请输入账号' },
    { min: 2, max: 20, message: '账号长度需在 2-20 个字符之间', trigger: 'blur' }
  ],
  password: [
    { required: true, trigger: 'blur', message: '请输入密码' },
    { min: 5, max: 20, message: '密码长度需在 5-20 个字符之间', trigger: 'blur' },
    { pattern: /^[^<>"'|\\]+$/, message: '密码不能包含非法字符 < > " \' \\ |', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, trigger: 'blur', message: '请再次输入密码' },
    { validator: equalToPassword, trigger: 'blur' }
  ],
  code: [{ required: true, trigger: 'change', message: '请输入验证码' }]
}

const codeUrl = ref('')
const loading = ref(false)
const captchaEnabled = ref(true)

function handleRegister() {
  proxy.$refs.registerRef.validate((valid) => {
    if (valid) {
      loading.value = true
      register(registerForm.value).then(() => {
        const username = registerForm.value.username
        ElMessageBox.alert(
          `<strong>注册成功：</strong>${username} 已进入审核，请等待运营确认角色。`,
          '系统提示',
          {
            dangerouslyUseHTMLString: true,
            type: 'success'
          }
        ).then(() => {
          router.push('/login')
        }).catch(() => {})
      }).catch(() => {
        loading.value = false
        if (captchaEnabled.value) {
          getCode()
        }
      })
    }
  })
}

function getCode() {
  getCodeImg().then((res) => {
    captchaEnabled.value = res.captchaEnabled === undefined ? true : res.captchaEnabled
    if (captchaEnabled.value) {
      codeUrl.value = 'data:image/gif;base64,' + res.img
      registerForm.value.uuid = res.uuid
    }
  })
}

getCode()
</script>

<style scoped lang="scss">
.register {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background-image: url('../assets/images/login-background.jpg');
  background-size: cover;
}

.title {
  margin: 0 auto 12px;
  text-align: center;
  color: #303133;
}

.subtitle {
  margin: 0 auto 24px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}

.register-form {
  border-radius: 8px;
  background: #ffffff;
  width: 420px;
  padding: 32px 32px 18px;
  box-shadow: 0 10px 30px rgba(31, 45, 61, 0.1);
  .el-input {
    height: 44px;
    input {
      height: 44px;
    }
  }
  .input-icon {
    height: 43px;
    width: 16px;
    margin-left: 0;
  }
}

.register-code {
  width: 33%;
  height: 44px;
  float: right;
  img {
    cursor: pointer;
    vertical-align: middle;
    border-radius: 6px;
  }
}

.tips {
  margin-top: 20px;
}

.el-register-footer {
  height: 40px;
  line-height: 40px;
  position: fixed;
  bottom: 0;
  width: 100%;
  text-align: center;
  color: #fff;
  font-family: Arial;
  font-size: 12px;
  letter-spacing: 1px;
}

.register-code-img {
  height: 44px;
  padding-left: 12px;
}
</style>
