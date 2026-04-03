<template>
  <n-drawer
    v-model:show="visible"
    :width="400"
    placement="right"
  >
    <n-drawer-content
      title="设置"
      closable
    >
      <div class="help-link">
        <n-a
          href="https://fanyi-api.baidu.com/manage/developer"
          target="_blank"
        >
          百度翻译开放平台
        </n-a>
      </div>
      <n-form
        :model="formData"
        label-placement="left"
        label-width="80"
      >
        <n-form-item label="APP ID">
          <n-input
            v-model:value="formData.appId"
            type="password"
            show-password-on="click"
            placeholder="请输入百度翻译 APP ID"
          />
        </n-form-item>

        <n-form-item label="密钥">
          <n-input
            v-model:value="formData.appKey"
            type="password"
            show-password-on="click"
            placeholder="请输入百度翻译密钥"
          />
        </n-form-item>

        <n-divider />

        <n-form-item label="翻译模式">
          <n-radio-group
            size="small"
            v-model:value="formData.translateMode"
          >
            <n-radio-button value="realtime">实时翻译</n-radio-button>
            <n-radio-button value="click">点击/回车翻译</n-radio-button>
          </n-radio-group>
        </n-form-item>

        <n-form-item
          v-if="formData.translateMode === 'realtime'"
          label="延迟时间"
        >
          <n-slider
            v-model:value="formData.delayTime"
            :min="sliderMin"
            :max="sliderMax"
            :markers="sliderMarkers"
          />
          <div class="slider-value">{{ formData.delayTime }}ms</div>
        </n-form-item>
      </n-form>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup>
import { computed, watch } from 'vue';
import { getConfig, saveConfig, sliderMarkers } from '@/utils/config';

const visible = defineModel({ default: false });

const sliderKeys = computed(() =>
  Object.keys(sliderMarkers)
    .map(Number)
    .sort((a, b) => a - b)
);
const sliderMin = computed(() => sliderKeys.value[0]);
const sliderMax = computed(() => sliderKeys.value[sliderKeys.value.length - 1]);

const formData = reactive({
  appId: '',
  appKey: '',
  translateMode: 'realtime',
  delayTime: 500,
});

watch(visible, (val) => {
  if (val) {
    const config = getConfig();
    if (config) {
      formData.appId = config.appId;
      formData.appKey = config.appKey;
      formData.translateMode = config.translateMode;
      formData.delayTime = config.delayTime;
    }
  }
});

watch(
  () => formData.delayTime,
  (val) => {
    const nearestKey = sliderKeys.value.reduce((prev, curr) =>
      Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev
    );
    if (formData.delayTime !== nearestKey) {
      formData.delayTime = nearestKey;
    }
  }
);

watch(
  () => [formData.appId, formData.appKey, formData.translateMode, formData.delayTime],
  () => {
    saveConfig({
      appId: formData.appId.trim(),
      appKey: formData.appKey.trim(),
      translateMode: formData.translateMode,
      delayTime: formData.delayTime,
    });
  }
);
</script>

<style scoped>
.help-link {
  margin-bottom: 16px;
}

.slider-value {
  text-align: center;
  color: #666;
  font-size: 14px;
  white-space: nowrap;
  margin-left: 4px;
}
</style>
