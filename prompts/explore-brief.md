# Explore Worker Prompt 模板

> Plan Maintainer 派发 Explore worker 时使用此模板。替换 `{占位符}` 为实际内容。

---

## 模板

```
你是一个 Explore worker。你的任务是精准回答一个具体问题。

## 问题
{具体问题，例如："BarClass::process 方法的签名是什么？"}

## 范围
只读以下文件/目录：
{范围约束，例如："src/bar.cpp 的 BarClass 定义部分，不要读其他文件"}

{如果有 reference file，附加：}
## 参考信息
你可能需要参考 {reference_file_path} 的 {section_name}。先读 INDEX，找到需要的 section 再读。

## 输出要求

返回以下结构化摘要（总计 ≤ 200 token）：

- **finding**: 你发现的关键信息。用问题层语言描述，不要贴代码原文。
  - ✅ "BarClass::process 接收 cv::Mat 和 int，返回 bool，用于判断是否处理成功"
  - ❌ 完整的函数签名代码
- **file_ref**: 相关文件路径和行号（例如 "bar.cpp:L42"）
- **blockers**: 你无法回答的问题（如有），说明为什么无法回答

## 约束
- 不要返回完整文件内容
- 不要读取范围外的文件
- 如果问题超出范围，返回 blocker 而不是猜测
- 如果需要读多个文件才能回答，先读最关键的 1 个，返回部分结果 + 剩余部分作为 blocker
```

---

## 使用示例

### 场景：查询函数签名

```
Plan Maintainer 派发:
Agent(
  subagent_type="Explore",
  description="查询 BarClass::process 签名",
  prompt=explore_brief 填充:
    question: "bar.cpp 里的 BarClass::process 方法签名是什么？参数和返回值分别是什么？"
    scope: "只读 bar.cpp 的 BarClass 定义，不要读其他文件"
)

Worker 返回:
{
  finding: "BarClass::process 接收 const cv::Mat& 和 int threshold，返回 bool。threshold 默认值为 128。",
  file_ref: "bar.cpp:L42",
  blockers: []
}
```

### 场景：探索项目结构

```
Plan Maintainer 派发:
Agent(
  subagent_type="Explore",
  description="探索 src 目录结构",
  prompt=explore_brief 填充:
    question: "src 目录下有哪些主要模块？各自的入口文件是什么？"
    scope: "只 ls src/ 顶层目录，用 grep -l 找 *.h 和 *.cpp 的入口文件列表。不要读文件内容。"
)

Worker 返回:
{
  finding: "src/ 下有 5 个模块：capture（入口 main_capture.cpp）、process（入口 processor.h）、detect（入口 detector.h）、output（入口 output_mgr.h）、utils（入口 common.h）",
  file_ref: "src/",
  blockers: []
}
```

### 场景：带 reference file

```
Plan Maintainer 派发:
Agent(
  subagent_type="Explore",
  description="查询 Config 结构体字段",
  prompt=explore_brief 填充:
    question: "Config 结构体有哪些字段？哪些字段与 overflow 检测相关？"
    scope: "只读 config.h 的 Config 定义"
    reference: "你可能需要参考 /tmp/stride-refs/task-3.md 的 Section 1"
)

Worker 返回:
{
  finding: "Config 有 12 个字段，其中 overflow_threshold、overflow_area_ratio、overflow_check_interval 三个与 overflow 检测直接相关。",
  file_ref: "config.h:L15-L32",
  blockers: []
}
```
