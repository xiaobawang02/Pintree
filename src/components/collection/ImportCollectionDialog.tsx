"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { createFlattenBookmarks } from "@/lib/utils/import-extension-data";
import { Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Textarea } from "@/components/ui/textarea";

interface ImportCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ImportCollectionDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportCollectionDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    file: null as File | null,
  });

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles[0]) {
      setFormData((prev) => ({
        ...prev,
        file: acceptedFiles[0],
      }));
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/json": [".json"],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB limit
    onError: (error) => {
      console.log(error);
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "file-too-large"
      ) {
        toast({
          variant: "destructive",
          title: "文件太大",
          description: "请选择一个小于 5MB 的 JSON 文件",
        });
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file || !formData.name) {
      toast({
        variant: "destructive",
        title: "错误",
        description: "请选择一个文件并输入一个集合名称",
      });
      return;
    }

    setLoading(true);

    try {
      const fileContent = await formData.file.text();
      const jsonData = JSON.parse(fileContent);

      // Batch import logic
      let batchSize = 100; // Process 100 bookmarks per batch

      let importedCollectionId = null;
      let folderMap: { [key: string]: string }[] = [];

      const startTime = Date.now();

      if (jsonData.metadata?.exportedFrom === "Pintree") {
        batchSize = 50
        // Import folders first
        const folderLevels = Object.keys(jsonData.folders)
          .map(Number)
          .sort((a, b) => a - b);

        for (const level of folderLevels) {
          const folderBatches = jsonData.folders[level];

          for (const folderBatch of folderBatches) {
            const folderRequestData = {
              name: formData.name,
              description: formData.description,
              folders: folderBatch,
              collectionId: importedCollectionId, // Will be null for the first batch
              folderMap: folderMap, // Pass existing folder mapping
            };

            const folderResponse: any = await fetch(
              "/api/collections/import-recover-data/recover-folders",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(folderRequestData),
              }
            );

            const folderData: any = await folderResponse.json();

            if (!folderResponse.ok) {
              toast({
                variant: "destructive",
                title: "文件夹导入失败",
                description: folderData.error || "在导入文件夹时发生错误",
              });
              return;
            }

            // Update collectionId and folderMap
            if (!importedCollectionId) {
              importedCollectionId = folderData.collectionId;
            }
            folderMap = folderData.insideFolderMap;

            // Show folder import progress
            toast({
              title: "文件夹导入进度",
              description: `正在导入第 ${level} 层: 第 ${folderBatches.indexOf(folderBatch) + 1}/${folderBatches.length} 批`,
            });
          }
        }

        // Batch import bookmarks 
        const totalBookmarks = jsonData.bookmarks.length;
        for (let i = 0; i < totalBookmarks; i += batchSize) {
          const batchStartTime = Date.now();
          const batchBookmarks = jsonData.bookmarks.slice(i, i + batchSize);
      
          const requestData = {
            bookmarks: batchBookmarks,
            collectionId: importedCollectionId, // Use the collection ID created when importing folders
            folderMap: folderMap, // Use folder mapping
          };
      
          const response: any = await fetch("/api/collections/import-recover-data/recover-bookmarks", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestData),
          });
      
          const data: any = await response.json();
          const batchEndTime = Date.now();
          const batchDuration = (batchEndTime - batchStartTime) / 1000; // seconds
          const remainingBatches = Math.ceil((totalBookmarks - i - batchSize) / batchSize);
          const estimatedRemainingTime = batchDuration * remainingBatches;
      
          if (!response.ok) {
            toast({
              variant: "destructive",
              title: "Bookmark Import Failed",
              description: data.message || "Failed to import bookmark collection",
            });
            return;
          }
      
          // Show import progress
          toast({
            title: "Bookmark Import Progress",
            description: `Imported ${Math.min(i + batchSize, totalBookmarks)}/${totalBookmarks} bookmarks 
              (${batchDuration.toFixed(2)}s, estimated remaining ${estimatedRemainingTime.toFixed(2)}s)`,
          });
        } 

        // Import completed
      } else {
        const flattenedBookmarks = createFlattenBookmarks(jsonData[0].children);
        const totalBookmarks = flattenedBookmarks.length;
        for (let i = 0; i < totalBookmarks; i += batchSize) {
          const batchStartTime = Date.now();
          const batchBookmarks = flattenedBookmarks.slice(i, i + batchSize);

          const requestData = {
            name: formData.name,
            description: formData.description,
            bookmarks: batchBookmarks,
            collectionId: importedCollectionId, // Append to the same collection in subsequent batches
            folderMap: folderMap,
          };

          const response: any = await fetch("/api/collections/import", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestData),
          });

          const data: any = await response.json();
          const batchEndTime = Date.now();
          const batchDuration = (batchEndTime - batchStartTime) / 1000; // seconds
          const remainingBatches = Math.ceil(
            (totalBookmarks - i - batchSize) / batchSize
          );
          const estimatedRemainingTime = batchDuration * remainingBatches;

          console.log(
            `Batch ${
              Math.floor(i / batchSize) + 1
            } imported, ${remainingBatches} batches remaining`,
            data
          );

          // Show import progress toast with batch time and estimated remaining time
          toast({
            title: "Import Progress",
            description: `Batch ${
              Math.floor(i / batchSize) + 1
            } imported (${batchDuration.toFixed(2)}s). 
          Estimated remaining time: ${estimatedRemainingTime.toFixed(
            2
          )}s (${remainingBatches} batches)`,
          });

          if (!response.ok) {
            toast({
              variant: "destructive",
              title: "Import Failed",
              description: data.message || "Failed to import collection",
            });
            return;
          }

          // Record the first batch's collection ID for subsequent batches
          if (i === 0) {
            importedCollectionId = data.collectionId;
          }

          if (data.insideFolderMap) {
            folderMap = [...data.insideFolderMap];
          }
        }
      }

      const totalImportTime = (Date.now() - startTime) / 1000;

      // Import completion handling
      onOpenChange(false);
      router.refresh();

      // Reset form
      setFormData({
        name: "",
        description: "",
        file: null,
      });

      toast({
        title: "导入成功",
        description: `集合 "${
          formData.name
        }" 已成功导入，用时 ${totalImportTime.toFixed(2)}s`,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Failed to import bookmark collection:", error);
      toast({
        variant: "destructive",
        title: "导入失败",
        description:
          error instanceof Error
            ? error.message
            : "在导入书签集合时发生错误",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>导入书签集合</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">集合名称</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="请输入集合名称"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value.slice(0, 140),
                }))
              }
              placeholder="请输入集合描述"
              rows={3}
              className="resize-none"
              maxLength={140}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">选择 JSON 文件（最大 5MB）</Label>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-6 cursor-pointer
                hover:border-primary/50 transition-colors
                ${
                  isDragActive
                    ? "border-primary bg-primary/10"
                    : "border-border"
                }
              `}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-2 text-center">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  {formData.file ? (
                    <span className="text-foreground font-medium">
                      {formData.file.name}
                    </span>
                  ) : (
                    <>
                      <span className="font-medium">点击上传</span> 或拖拽文件到此处
                      <p className="text-xs">支持 JSON 文件</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "导入中..." : "导入"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}