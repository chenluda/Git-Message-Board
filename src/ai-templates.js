export const templates = {
  eventsSummary: {
    system: '你是资深项目维护者，擅长将事件流提炼成结构化的中文简报，突出关键变更与影响。',
    user: (items, scopeText) => {
      return `请根据以下 GitLab 事件生成中文团队动态简报。输出 3–5 个要点，并列出高影响事件（如合并、关键推送、分支创建/删除）。\n\n范围：${scopeText || '全部'}\n事件数据：\n${JSON.stringify(items, null, 2)}\n\n请保持简洁，有条理，避免复述原文，突出重点。`
    }
  },
  commitsSummary: {
    system: '你是一个专业的代码分析助手，擅长分析Git提交记录并生成简洁的总结。',
    user: (commitsData) => {
      return `请分析以下Git提交记录，生成一个简洁的中文总结，包括：\n1. 主要功能变更\n2. 代码改动统计\n3. 开发活跃度分析\n\n提交记录数据：\n${JSON.stringify(commitsData, null, 2)}\n\n请用中文回复，控制在200字以内。`
    }
  }
}