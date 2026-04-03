<script setup>
import { onMounted, ref } from 'vue';
import Hello from './Hello/index.vue';

const route = ref('');
const enterAction = ref({});
const onEnter = ref(null);

onMounted(() => {
  window.ztools.onPluginEnter((action) => {
    route.value = action.code;
    enterAction.value = action;
    onEnter.value?.();
  });
  window.ztools.onPluginOut(() => {
    route.value = '';
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      onEnter.value?.();
    }
  });
});
</script>

<template>
  <n-config-provider>
    <n-message-provider>
      <Hello
        :enter-action="enterAction"
        :on-enter="onEnter"
      />
    </n-message-provider>
  </n-config-provider>
</template>
