// backend/jest.config.js
module.exports = {
  // บังคับให้ Jest โหลดแพ็กเกจ uuid แบบ CommonJS (require) เพื่อแก้บัค export
  moduleNameMapper: {
    '^uuid$': require.resolve('uuid'),
  },
};