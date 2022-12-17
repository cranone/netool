<script setup lang="ts">
import Versions from './components/Versions.vue'
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

type NetData = {
  num: number
  name: string
  url: string
  type: string
  requestData: string
  requestHeader: string
  extraLogic: string
}
const methodType = reactive(['POST', 'GET'])
const responseData = ref('')
const dataNum = ref(0)
const dataList = reactive<NetData[]>([])
const netData = ref({ ...dataList[0] })

onMounted(() => {
  init()
  loadDataList()
  console.log(`初始化完成`)
})
//初始化
function init(): void {
  //网络响应回调
  window.api.response((_event, value) => {
    responseData.value = value
  })
}
//载入存档列表
function loadDataList(): void {
  const readDataList = localStorage.getItem('dataList')
  if (readDataList) {
    dataList.push(...JSON.parse(readDataList))
  } else {
    dataList.length = 0
    for (let i = 0; i < 10; i++) {
      dataList.push(createData(i))
    }
    saveDataAll()
  }
  netData.value = { ...dataList[0] }
}
//初始化存档数据
function createData(num): NetData {
  return {
    num: num,
    name: '存档' + num,
    url: '',
    type: 'POST',
    requestData: '',
    requestHeader: '{"content-type":"application/json;charset=utf-8"}',
    extraLogic: ''
  }
}
//读取数据
function loadData(): void {
  netData.value = { ...dataList[dataNum.value] }
}
//保存数据
function saveData(): void {
  dataList[dataNum.value] = { ...netData.value }
  saveDataAll()
}
function saveDataAll(): void {
  const data = JSON.parse(JSON.stringify(dataList))
  //保存到localStorage
  localStorage.setItem('dataList', JSON.stringify(data))
}
//删除数据
function delData(): void {
  confirm('warn', '提示', '确认要删除吗', () => {
    dataList[dataNum.value] = createData(dataNum.value)
  })
}
//删除全部数据
function delDataAll(): void {
  confirm('warn', '提示', '确认要初始化吗，存档数据将会全部清除', () => {
    localStorage.removeItem('dataList')
    loadDataList()
  })
}
//重命名存档
function renameData(): void {
  ElMessageBox.prompt('请输入名称', '提示', {
    confirmButtonText: 'OK',
    cancelButtonText: 'Cancel',
    inputValue: dataList[dataNum.value].name
  }).then(({ value }) => {
    dataList[dataNum.value].name = value
    const readDataList = localStorage.getItem('dataList')
    if (readDataList) {
      const data = JSON.parse(readDataList)
      data[dataNum.value].name = value
      localStorage.setItem('dataList', JSON.stringify(data))
      alertSuccess()
    } else {
      ElMessage({
        type: 'success',
        message: '请先保存数据'
      })
    }
  })
}
//警告框
function confirm(type, title, msg, func): void {
  ElMessageBox.confirm(msg, title, {
    confirmButtonText: 'OK',
    cancelButtonText: 'Cancel',
    type: type
  }).then(() => {
    func()
    alertSuccess()
  })
}
//提示框
function alertSuccess(): void {
  ElMessage({
    type: 'success',
    message: '操作成功'
  })
}
//请求
function sendRequest(): void {
  // 未输入URL
  if (!netData.value.url) {
    ElMessage({
      showClose: true,
      grouping: true,
      message: '请输入URL',
      type: 'error'
    })
    return
  }
  responseData.value = '请求中...'
  window.api.request(
    {
      url: netData.value.url,
      method: netData.value.type
    },
    netData.value.requestHeader,
    netData.value.requestData
  )
}
//格式化json
function formatJSON(data): string {
  return JSON.stringify(JSON.parse(data), null, '\t')
}
//格式化xml
function formatXML(data): string {
  try {
    const xmlDoc = new DOMParser().parseFromString(data, 'application/xml')
    const xsltDoc = new DOMParser().parseFromString(
      [
        // describes how we want to modify the XML - indent everything
        '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        ' <xsl:strip-space elements="*"/>',
        ' <xsl:template match="para[content-style][not(text())]">',
        // change to just text() to strip space in text nodes
        ' <xsl:value-of select="normalize-space(.)"/>',
        ' </xsl:template>',
        ' <xsl:template match="node()|@*">',
        ' <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>',
        ' </xsl:template>',
        ' <xsl:output indent="yes"/>',
        '</xsl:stylesheet>'
      ].join('\n'),
      'application/xml'
    )
    const xsltProcessor = new XSLTProcessor()
    xsltProcessor.importStylesheet(xsltDoc)
    const resultDoc = xsltProcessor.transformToDocument(xmlDoc)
    const resultXml = new XMLSerializer().serializeToString(resultDoc)
    return resultXml
  } catch (e) {
    console.info(e)
    return data
  }
}
</script>

<template>
  <div class="common-layout">
    <el-container>
      <el-main>
        <div>
          <el-row :gutter="20">
            <el-col :span="4">
              <el-select v-model="netData.type" placeholder="请求方式">
                <el-option v-for="item in methodType" :key="item" :label="item" :value="item" />
              </el-select>
            </el-col>
            <el-col :span="18"><el-input v-model="netData.url" placeholder="请求地址" /></el-col>
            <el-col :span="2">
              <el-button type="primary" @click="sendRequest">提交</el-button>
            </el-col>
          </el-row>
          <el-input
            v-model="netData.requestHeader"
            :rows="3"
            class="mb-20"
            type="textarea"
            placeholder="请求头"
          />
          <el-input
            v-model="netData.requestData"
            :rows="6"
            class="mb-20"
            type="textarea"
            placeholder="请求数据"
          />
          <el-input
            v-model="responseData"
            :rows="6"
            class="mb-20"
            type="textarea"
            readonly="readonly"
            placeholder="响应数据"
          />
          <div class="mb-20">
            <el-button type="primary" @click="netData.requestData = formatJSON(netData.requestData)"
              >格式化请求JSON</el-button
            >
            <el-button type="primary" @click="responseData = formatJSON(responseData)"
              >格式化响应JSON</el-button
            >
            <el-button type="primary" @click="netData.requestData = formatXML(netData.requestData)"
              >格式化请求XML</el-button
            >
            <el-button type="primary" @click="responseData = formatXML(responseData)"
              >格式化响应XML</el-button
            >
          </div>
          <el-row :gutter="20">
            <el-col :span="4">
              <el-select v-model="dataNum" placeholder="快速保存">
                <el-option
                  v-for="item in dataList"
                  :key="item.num"
                  :label="item.name"
                  :value="item.num"
                />
              </el-select>
            </el-col>
            <el-button type="primary" @click="renameData">重命名</el-button>
            <el-button type="success" @click="saveData">保存数据</el-button>
            <el-button type="success" @click="loadData">读取数据</el-button>
            <el-button type="danger" @click="delData">清除数据</el-button>
            <el-button type="danger" @click="delDataAll">初始化数据</el-button>
          </el-row>
          <el-input
            v-model="netData.extraLogic"
            :rows="5"
            class="mb-20"
            type="textarea"
            placeholder="挂载JavaScript,该JavaScript将会在提交前被执行"
          />
        </div>
      </el-main>
      <el-footer><Versions></Versions></el-footer>
    </el-container>
  </div>
</template>

<style>
.el-row {
  margin-bottom: 20px;
}
.mb-20 {
  margin-bottom: 20px;
}
</style>
