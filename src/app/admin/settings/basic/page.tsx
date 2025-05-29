"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminHeader } from "@/components/admin/header";

import { useSettingImages } from "@/hooks/useSettingImages";
import { updateSettingImage } from "@/actions/update-setting-image";

import { Skeleton } from "@/components/ui/skeleton";

import FooterSettingsCard from "./FooterSettingsCard";
import SocialMediaCard from "./SocialMediaCard";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useRouter } from "next/navigation";

import { revalidateData } from "@/actions/revalidate-data";



export default function BasicSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"basicInfo" |"statistics" | "footerSettings" | "socialMedia">("basicInfo");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    websiteName: "",
    logoUrl: "",
    faviconUrl: "",
    githubUrl: "",
    twitterUrl: "",
    discordUrl: "",
    weixinUrl: "",
    weiboUrl: "",
    bilibiliUrl: "",
    zhihuUrl: "",
    youtubeUrl: "",
    linkedinUrl: "",
    copyrightText: "",
    contactEmail: "",
    googleAnalyticsId: "",
    clarityId: "",
  });

  // 加载设置数据
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/settings?group=basic");
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Load settings failed:", errorData); // 调试日志
          throw new Error(errorData.error || "Load settings failed");
        }

        const data = await response.json();
        console.log("Loaded settings:", data); // 调试日志

        const sanitizedData = Object.keys(data).reduce(
          (acc, key) => ({
            ...acc,
            [key]: data[key] ?? "", // 使用空字符串替代 undefined
          }),
          {}
        );

        setSettings((prev) => ({
          ...prev,
          ...sanitizedData,
        }));
      } catch (error) {
        console.error("Load settings error:", error);
        toast.error(error instanceof Error ? error.message : "Load settings failed");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      console.log("Submitted settings for tab:", activeTab); // 调试日志
  
      const saveSettingPromises = [];
  
      // 根据当前标签页筛选需要保存的设置项
      const settingsToSave = (() => {
        switch (activeTab) {
          case "basicInfo":
            return {
              websiteName: settings.websiteName,
            };
          case "statistics":
            return {
              googleAnalyticsId: settings.googleAnalyticsId,
              clarityId: settings.clarityId
            };
          case "footerSettings":
            return {
              copyrightText: settings.copyrightText,
              contactEmail: settings.contactEmail
            };
          case "socialMedia":
            return {
              githubUrl: settings.githubUrl,
              twitterUrl: settings.twitterUrl,
              discordUrl: settings.discordUrl,
              weixinUrl: settings.weixinUrl,
              weiboUrl: settings.weiboUrl,
              bilibiliUrl: settings.bilibiliUrl,
              zhihuUrl: settings.zhihuUrl,
              youtubeUrl: settings.youtubeUrl,
              linkedinUrl: settings.linkedinUrl
            };
          default:
            return {};
        }
      })();
  
      // 处理图片上传（仅针对基本信息标签页）
      if (activeTab === "basicInfo") {
        const logoInput = document.getElementById('logoUrl') as HTMLInputElement;
        const faviconInput = document.getElementById('faviconUrl') as HTMLInputElement;
  
        if (logoInput && logoInput.files && logoInput.files.length > 0) {
          const logoFile = logoInput.files[0];
          const logoFormData = new FormData();
          logoFormData.append('settingKey', 'logoUrl');
          logoFormData.append('file', logoFile);
          saveSettingPromises.push(
            updateSettingImage(logoFormData)
          );
        }
  
        if (faviconInput && faviconInput.files && faviconInput.files.length > 0) {
          const faviconFile = faviconInput.files[0];
          const faviconFormData = new FormData();
          faviconFormData.append('settingKey', 'faviconUrl');
          faviconFormData.append('file', faviconFile);
          saveSettingPromises.push(
            updateSettingImage(faviconFormData)
          );
        }
      }
  
      // 添加基本设置保存到 saveSettingPromises
      saveSettingPromises.push(
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settingsToSave),
        }).then(async response => {
          if (!response.ok) {
            const errorData = await response.json();
            console.error("API error response:", errorData);
            throw new Error(errorData.error || "Save failed");
          }
          return response.json();
        }).then(result => {
          console.log("Save success:", result); // 调试日志
        })
      );
  
      // 并行处理所有操作
      await Promise.all(saveSettingPromises);
  
      toast.success(`Settings saved`);

      revalidateData();
    } catch (error) {
      console.error("Save settings failed:", error);
      toast.error(error instanceof Error ? error.message : "Save settings failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-[#f9f9f9]">
      <AdminHeader title="Basic Settings">
        <Button
          onClick={handleSubmit}
          disabled={loading}
        >
          保存更改
        </Button>
      </AdminHeader>

      <div className="mx-auto px-4 py-12 bg-[#f9f9f9]">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8">
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as typeof activeTab)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="basicInfo">基础信息</TabsTrigger>
              <TabsTrigger value="statistics">统计代码</TabsTrigger>
              <TabsTrigger value="footerSettings">页脚设置</TabsTrigger>
              <TabsTrigger value="socialMedia">社交媒体</TabsTrigger>
            </TabsList>

            <TabsContent value="basicInfo">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground font-normal">
                  基础信息
                </p>
                <Card className="border bg-white">
                  <CardHeader className="border-b">
                    <CardTitle>基础信息</CardTitle>
                    <CardDescription>设置您的网站基础信息</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 p-6">
                    <div className="grid gap-2">
                      <Label htmlFor="websiteName">网站名称</Label>
                      <Input
                        id="websiteName"
                        name="websiteName"
                        value={settings.websiteName}
                        onChange={handleChange}
                        placeholder="请输入网站名称"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>网站 Logo</Label>
                      <LogoUploader />
                    </div>

                    <div className="grid gap-2">
                      <Label>网站 Favicon</Label>
                      <FaviconUploader />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="statistics">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground font-normal">
                  统计代码
                </p>
                <Card className="border bg-white">
                  <CardHeader className="border-b">
                    <CardTitle>统计代码</CardTitle>
                    <CardDescription>设置您的网站统计代码</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 p-6">
                    <div className="grid gap-2">
                      <Label htmlFor="googleAnalyticsId">
                        Google Analytics ID
                      </Label>
                      <Input
                        id="googleAnalyticsId"
                        name="googleAnalyticsId"
                        value={settings.googleAnalyticsId}
                        onChange={handleChange}
                        placeholder="G-XXXXXXXXXX"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="clarityId">Microsoft Clarity ID</Label>
                      <Input
                        id="clarityId"
                        name="clarityId"
                        value={settings.clarityId}
                        onChange={handleChange}
                        placeholder="XXXXXXXXXX"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="footerSettings">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground font-normal">
                  页脚设置
                </p>
                <FooterSettingsCard
                  settings={settings}
                  handleChange={handleChange}
                />
              </div>
            </TabsContent>

            <TabsContent value="socialMedia">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground font-normal">
                  社交媒体链接
                </p>
                <SocialMediaCard
                  settings={settings}
                  handleChange={handleChange}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


// 添加 Logo 上传组件
function LogoUploader() {
  const { images, isLoading, error } = useSettingImages("logoUrl");
  const [currentLogoUrl, setCurrentLogoUrl] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const base64 = event.target?.result as string;

      // 立即展示预览
      setCurrentLogoUrl(base64);
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <div className="relative w-[260px] h-[60px] border rounded bg-white">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Skeleton className="w-full h-full" />
            </div>
          ) : (
            <Image
              src={currentLogoUrl || images[0].url}
              alt="Current Logo"
              fill
              className="object-contain p-2"
            />
          )}
        </div>
        <Input
          id="logoUrl"
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFileChange}
          className="max-w-[200px] bg-slate-100"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        推荐尺寸：520x120px，支持 PNG、JPG 格式
      </p>
    </div>
  );
};

function FaviconUploader() {
  const { images, isLoading, error } = useSettingImages("faviconUrl");
  const [currentFaviconUrl, setCurrentFaviconUrl] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const base64 = event.target?.result as string;

      // 立即展示预览
      setCurrentFaviconUrl(base64);
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        {isLoading ? (
          <div className="relative w-[32px] h-[32px] border rounded bg-white">
            <Skeleton className="w-full h-full" />
          </div>
        ) : (
          <div className="relative w-[32px] h-[32px] border rounded bg-white">
            <Image
              src={currentFaviconUrl || images[0].url}
              alt="Current Favicon"
              fill
              className="object-contain p-1"
            />
          </div>
        )}
        <Input
          id="faviconUrl"
          type="file"
          accept=".ico,.png"
          onChange={handleFileChange}
          className="max-w-[200px] bg-slate-100"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        推荐尺寸：512x512px，支持 ICO、PNG 格式
      </p>
    </div>
  );
};
