// 简单的演示用数据（事件、项目、分支、提交、流水线）

const now = Date.now()
const iso = (minutesAgo) => new Date(now - minutesAgo * 60 * 1000).toISOString()

export const sampleProjects = {
  101: {
    id: 101,
    name: 'Acme Web App',
    description: '公司网站与后台管理前端工程',
    path_with_namespace: 'acme/web-app',
    web_url: 'https://gitlab.com/acme/web-app',
    default_branch: 'main',
    visibility: 'public',
    last_activity_at: iso(10)
  },
  102: {
    id: 102,
    name: 'Acme Mobile App',
    description: '移动端应用（Flutter）',
    path_with_namespace: 'acme/mobile-app',
    web_url: 'https://gitlab.com/acme/mobile-app',
    default_branch: 'develop',
    visibility: 'public',
    last_activity_at: iso(40)
  },
  103: {
    id: 103,
    name: 'Foo Bar',
    description: '示例库与脚手架工具',
    path_with_namespace: 'foo/bar',
    web_url: 'https://gitlab.com/foo/bar',
    default_branch: 'master',
    visibility: 'internal',
    last_activity_at: iso(90)
  }
}

export const sampleProjectsList = Object.values(sampleProjects)

export const sampleBranchesByProject = {
  101: [
    { name: 'main', default: true },
    { name: 'feature/login', default: false },
    { name: 'release/v1.2', default: false }
  ],
  102: [
    { name: 'develop', default: true },
    { name: 'fix/perf', default: false },
    { name: 'release/v2.0', default: false }
  ],
  103: [
    { name: 'master', default: true },
    { name: 'hotfix/2.0.1', default: false }
  ]
}

export const sampleCommitsByProject = {
  101: [
    {
      id: 'f3a4be7c8d9e12f4a6b7c8d9e12f4a6b7c8d9e12',
      short_id: 'f3a4be7c',
      title: '修复登录异常并增加日志',
      message: '修复登录异常并增加日志\n- 修复 token 解析\n- 增加失败重试\n- 打点日志',
      committed_date: iso(60),
      author_avatar_url: 'https://i.pravatar.cc/100?img=1',
      author_name: 'Alice',
      author_email: 'alice@example.com',
      parent_ids: [],
      stats: { additions: 34, deletions: 12 },
      branch: 'main'
    },
    {
      id: 'aaaaaaaabbbbbbbbccccccccddddddddeeeeeeee',
      short_id: 'aaaaaaa',
      title: '新增 README 与使用说明',
      message: '新增 README 与使用说明',
      committed_date: iso(130),
      author_avatar_url: 'https://i.pravatar.cc/100?img=2',
      author_name: 'Bob',
      author_email: 'bob@example.com',
      parent_ids: [],
      stats: { additions: 120, deletions: 0 },
      branch: 'main'
    },
    {
      id: 'bbbbbbbbaaaaaaaaccccccccddddddddeeeeeeee',
      short_id: 'bbbbbbb',
      title: '合并 feature/login',
      message: '合并分支 feature/login 到 main',
      committed_date: iso(180),
      author_avatar_url: 'https://i.pravatar.cc/100?img=1',
      author_name: 'Alice',
      author_email: 'alice@example.com',
      parent_ids: ['1111111122222222333333334444444455555555', '6666666677777777888888889999999900000000'],
      stats: { additions: 85, deletions: 30 },
      branch: 'feature/login'
    },
    {
      id: '1111222233334444555566667777888899990000',
      short_id: '11112222',
      title: '发布 v1.2.0',
      message: '打 tag v1.2.0 并发布',
      committed_date: iso(240),
      author_avatar_url: 'https://i.pravatar.cc/100?img=3',
      author_name: 'Alice',
      author_email: 'alice@example.com',
      parent_ids: [],
      stats: { additions: 10, deletions: 3 },
      branch: 'release/v1.2'
    }
  ],
  102: [
    {
      id: '9c0b1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c',
      short_id: '9c0b1d2e',
      title: '发布版本 v1.2.3',
      message: '发布版本 v1.2.3，包含性能优化与 bug 修复',
      committed_date: iso(30),
      author_avatar_url: 'https://i.pravatar.cc/100?img=2',
      author_name: 'Bob',
      author_email: 'bob@example.com',
      parent_ids: [],
      stats: { additions: 58, deletions: 22 },
      branch: 'develop'
    },
    {
      id: 'ccccccccddddddddaaaaaaaaeeeeeeeeffffffff',
      short_id: 'cccccccc',
      title: '图片懒加载优化',
      message: '在移动端引入图片懒加载，减少首屏体积',
      committed_date: iso(120),
      author_avatar_url: 'https://i.pravatar.cc/100?img=5',
      author_name: 'Bob',
      author_email: 'bob@example.com',
      parent_ids: [],
      stats: { additions: 200, deletions: 40 },
      branch: 'fix/perf'
    }
  ],
  103: [
    {
      id: 'abcdefabcdefabcdefabcdefabcdefabcdefabcd',
      short_id: 'abcdefab',
      title: '重大升级：2.0.0',
      message: '重构目录结构并发布 2.0.0',
      committed_date: iso(20),
      author_avatar_url: 'https://i.pravatar.cc/100?img=8',
      author_name: '陈强',
      author_email: 'qiang@example.com',
      parent_ids: [],
      stats: { additions: 500, deletions: 120 },
      branch: 'master'
    },
    {
      id: 'ddddddddeeeeeeeeffffffffaaaaaaaa11111111',
      short_id: 'dddddddd',
      title: '修复 2.0.1 热修复问题',
      message: '修复 2.0.1 热修复中遇到的异常',
      committed_date: iso(80),
      author_avatar_url: 'https://i.pravatar.cc/100?img=7',
      author_name: 'David',
      author_email: 'david@example.com',
      parent_ids: [],
      stats: { additions: 25, deletions: 10 },
      branch: 'hotfix/2.0.1'
    }
  ]
}

export const samplePipelinesByProject = {
  101: [
    {
      id: 5001,
      ref: 'main',
      sha: 'f3a4be7c8d9e12f4a6b7c8d9e12f4a6b7c8d9e12',
      status: 'success',
      source: 'push',
      created_at: iso(15),
      updated_at: iso(15),
      user: { name: 'Alice' }
    },
    {
      id: 5002,
      ref: 'feature/login',
      sha: 'bbbbbbbbaaaaaaaaccccccccddddddddeeeeeeee',
      status: 'running',
      source: 'web',
      created_at: iso(25),
      updated_at: iso(20),
      user: { name: 'Alice' }
    },
    {
      id: 5003,
      ref: 'release/v1.2',
      sha: '1111222233334444555566667777888899990000',
      status: 'failed',
      source: 'pipeline',
      created_at: iso(240),
      updated_at: iso(230),
      user: { name: 'Bob' }
    }
  ],
  102: [
    {
      id: 6001,
      ref: 'develop',
      sha: '9c0b1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c',
      status: 'success',
      source: 'push',
      created_at: iso(30),
      updated_at: iso(28),
      user: { name: 'Bob' }
    },
    {
      id: 6002,
      ref: 'fix/perf',
      sha: 'ccccccccddddddddaaaaaaaaeeeeeeeeffffffff',
      status: 'pending',
      source: 'schedule',
      created_at: iso(120),
      updated_at: iso(115),
      user: { name: 'Bob' }
    }
  ],
  103: [
    {
      id: 7001,
      ref: 'master',
      sha: 'abcdefabcdefabcdefabcdefabcdefabcdefabcd',
      status: 'success',
      source: 'push',
      created_at: iso(20),
      updated_at: iso(19),
      user: { name: '陈强' }
    },
    {
      id: 7002,
      ref: 'hotfix/2.0.1',
      sha: 'ddddddddeeeeeeeeffffffffaaaaaaaa11111111',
      status: 'manual',
      source: 'web',
      created_at: iso(80),
      updated_at: iso(78),
      user: { name: 'David' }
    }
  ]
}

export const sampleEvents = [
  {
    id: 9001,
    action_name: 'pushed',
    target_type: 'PushEvent',
    project_id: 101,
    author_name: 'Alice',
    author_username: 'alice',
    author: { avatar_url: 'https://i.pravatar.cc/100?img=1' },
    created_at: iso(5),
    push_data: {
      ref: 'main',
      ref_type: 'branch',
      commit_title: '修复登录异常并增加日志',
      commit_sha: 'f3a4be7c8d9e12f4a6b7c8d9e12f4a6b7c8d9e12'
    }
  },
  {
    id: 9002,
    action_name: 'pushed new',
    target_type: 'PushEvent',
    project_id: 101,
    author_name: 'Bob',
    author_username: 'bob',
    author: { avatar_url: 'https://i.pravatar.cc/100?img=2' },
    created_at: iso(30),
    push_data: {
      ref: 'v1.2.3',
      ref_type: 'tag',
      commit_title: '发布版本 v1.2.3',
      commit_sha: '9c0b1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c'
    }
  },
  {
    id: 9003,
    action_name: 'deleted',
    target_type: 'PushEvent',
    project_id: 101,
    author_name: 'Alice',
    author_username: 'alice',
    author: { avatar_url: 'https://i.pravatar.cc/100?img=3' },
    created_at: iso(120),
    push_data: {
      ref: 'feature/old-experiment',
      ref_type: 'branch',
      commit_title: '删除废弃分支',
      commit_sha: '1111222233334444555566667777888899990000'
    }
  },
  {
    id: 9004,
    action_name: 'created',
    target_type: 'Issue',
    target_title: '添加文档与使用指南',
    project_id: 102,
    author_name: '陈强',
    author_username: 'qiang',
    author: { avatar_url: 'https://i.pravatar.cc/100?img=4' },
    created_at: iso(240)
  },
  {
    id: 9005,
    action_name: 'updated',
    target_type: 'MergeRequest',
    target_title: '提升移动端性能（懒加载图片）',
    project_id: 102,
    author_name: 'Bob',
    author_username: 'bob',
    author: { avatar_url: 'https://i.pravatar.cc/100?img=5' },
    created_at: iso(360)
  },
  {
    id: 9006,
    action_name: 'merged',
    target_type: 'MergeRequest',
    target_title: '修复 #42：异常处理',
    project_id: 101,
    author_name: 'Alice',
    author_username: 'alice',
    author: { avatar_url: 'https://i.pravatar.cc/100?img=6' },
    created_at: iso(720)
  },
  {
    id: 9007,
    action_name: 'commented on',
    target_type: 'Issue',
    target_title: '讨论：重构目录结构',
    project_id: 103,
    author_name: 'David',
    author_username: 'david',
    author: { avatar_url: 'https://i.pravatar.cc/100?img=7' },
    created_at: iso(1440)
  },
  {
    id: 9008,
    action_name: 'pushed',
    target_type: 'PushEvent',
    project_id: 103,
    author_name: '陈强',
    author_username: 'qiang',
    author: { avatar_url: 'https://i.pravatar.cc/100?img=8' },
    created_at: iso(20),
    push_data: {
      ref: 'v2.0.0',
      ref_type: 'tag',
      commit_title: '重大升级：2.0.0',
      commit_sha: 'abcdefabcdefabcdefabcdefabcdefabcdefabcd'
    }
  }
]