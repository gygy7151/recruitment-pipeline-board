import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// 앱 빌드 설정은 그대로 두고 테스트 설정만 덧붙인다.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // 훅을 렌더링하고 localStorage를 쓰려면 DOM이 필요하다.
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      // 테스트마다 vi.fn 호출 기록과 구현을 초기화해 서로 새지 않게 한다.
      mockReset: true,
    },
  }),
)
