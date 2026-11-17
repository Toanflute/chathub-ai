import WorkflowEditor from "@/components/workflow-editor";
export const metadata = { title: "Chỉnh sửa workflow | ChatHub AI" };
type Props = { params: { id: string } };
export default function WorkflowEditPage({ params }: Props) { return <WorkflowEditor workflowId={params.id}/>; }
