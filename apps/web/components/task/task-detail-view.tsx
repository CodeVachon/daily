import type { TaskDetailData } from "@/lib/task-detail"

import { ActivityTimeline } from "./activity-timeline"
import { ChecklistSection } from "./checklist-section"
import { CommentsSection } from "./comments-section"
import { DependenciesSection } from "./dependencies-section"
import { LinksSection } from "./links-section"
import { SubtasksSection } from "./subtasks-section"
import { TaskEditor } from "./task-editor"

/** The full task interface, shared by the task page and the board/list drawer. */
export function TaskDetailView({ data }: { data: TaskDetailData }) {
  const { task } = data
  return (
    <div className="@container">
      <TaskEditor
        key={task.updatedAt.toISOString()}
        task={task}
        options={data.options}
      />
      <div className="mt-8 grid max-w-2xl gap-8">
        <ChecklistSection taskId={task.id} items={data.checklist} />
        <SubtasksSection taskId={task.id} subtasks={data.subtasks} />
        <DependenciesSection taskId={task.id} blockedBy={data.blockedBy} />
        <LinksSection taskId={task.id} links={data.links} />
        <CommentsSection taskId={task.id} comments={data.comments} />
        <ActivityTimeline entries={data.timeline} />
      </div>
    </div>
  )
}
