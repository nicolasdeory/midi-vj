import { useRef, useState } from "react";
import { Copy, Download, FolderOpen, Plus, Trash2, Upload } from "lucide-react";
import type { MidiVjProject } from "@midi-vj/core";
import {
  createDefaultProject,
  duplicateProject,
  parseProject,
  serializeProject,
} from "@midi-vj/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  createProjectId,
  deleteProjectRecord,
  downloadJson,
  loadProjectRecords,
  pickJsonFile,
  type ProjectRecord,
  setActiveProjectId,
  upsertProjectRecord,
} from "@/lib/storage";
import { cn } from "@/lib/utils";

interface Props {
  activeProjectId: string | null;
  project: MidiVjProject | null;
  onOpenProject: (record: ProjectRecord) => void;
  onNewProject: (record: ProjectRecord) => void;
  onImportProject: (project: MidiVjProject) => void;
}

export function ProjectMenu({
  activeProjectId,
  project,
  onOpenProject,
  onNewProject,
  onImportProject,
}: Props) {
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<ProjectRecord[]>(() => loadProjectRecords());
  const importRef = useRef<HTMLInputElement>(null);

  const refresh = () => setRecords(loadProjectRecords());

  const handleNew = () => {
    const id = createProjectId();
    const next = createDefaultProject("Untitled");
    const record = { id, project: next };
    upsertProjectRecord(record);
    setActiveProjectId(id);
    refresh();
    onNewProject(record);
    setOpen(false);
  };

  const handleDuplicate = () => {
    if (!project || !activeProjectId) return;
    const id = createProjectId();
    const record = { id, project: duplicateProject(project) };
    upsertProjectRecord(record);
    setActiveProjectId(id);
    refresh();
    onOpenProject(record);
  };

  const handleDelete = (id: string) => {
    deleteProjectRecord(id);
    refresh();
  };

  const handleExport = () => {
    if (!project) return;
    downloadJson(`${project.meta.name.replace(/\s+/g, "-").toLowerCase()}.midivj.json`, serializeProject(project));
  };

  const handleImportFile = async (text: string) => {
    const parsed = parseProject(text);
    onImportProject(parsed);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={(value) => { setOpen(value); if (value) refresh(); }}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-[180px] truncate">
          <FolderOpen className="h-4 w-4 shrink-0" />
          {project?.meta.name ?? "Projects"}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[360px] sm:max-w-[360px]">
        <SheetHeader>
          <SheetTitle>Projects</SheetTitle>
          <SheetDescription>Local shows saved in this browser.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={handleNew}>
            <Plus className="h-4 w-4" />
            New
          </Button>
          <Button size="sm" variant="outline" disabled={!project} onClick={handleDuplicate}>
            <Copy className="h-4 w-4" />
            Duplicate
          </Button>
          <Button size="sm" variant="outline" disabled={!project} onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const text = await pickJsonFile();
              if (text) await handleImportFile(text);
            }}
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <input ref={importRef} type="file" accept="application/json,.json" className="hidden" />
        </div>

        {project ? (
          <div className="mt-4 space-y-2">
            <Label htmlFor="project-name">Current name</Label>
            <Input id="project-name" value={project.meta.name} readOnly className="text-sm" />
          </div>
        ) : null}

        <div className="mt-6 space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Saved here</p>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved projects yet.</p>
          ) : (
            records.map((record) => (
              <div
                key={record.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border border-border p-2",
                  record.id === activeProjectId && "border-primary/40 bg-primary/5",
                )}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    setActiveProjectId(record.id);
                    onOpenProject(record);
                    setOpen(false);
                  }}
                >
                  <p className="truncate text-sm font-medium">{record.project.meta.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {record.project.groups.length} group
                    {record.project.groups.length === 1 ? "" : "s"}
                  </p>
                </button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(record.id)}
                  disabled={records.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
