import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";

  const SocialMediaCard = ({
    settings,
    handleChange,
  }: {
    settings: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => {
    const socialLinks = [
      {
        id: "githubUrl",
        label: "GitHub 链接",
        placeholder: "https://github.com/你的用户名",
      },
      {
        id: "twitterUrl",
        label: "Twitter 链接",
        placeholder: "https://twitter.com/你的用户名",
      },
      {
        id: "discordUrl",
        label: "Discord 链接",
        placeholder: "https://discord.gg/你的服务器",
      },
      {
        id: "youtubeUrl",
        label: "YouTube 频道链接",
        placeholder: "https://youtube.com/c/你的频道",
      },
      { id: "weixinUrl", label: "微信公众号链接", placeholder: "微信公众号链接" },
      {
        id: "weiboUrl",
        label: "微博主页链接",
        placeholder: "https://weibo.com/你的主页",
      },
      {
        id: "bilibiliUrl",
        label: "Bilibili 主页链接",
        placeholder: "https://space.bilibili.com/你的主页",
      },
      {
        id: "zhihuUrl",
        label: "知乎主页链接",
        placeholder: "https://zhihu.com/people/你的主页",
      },
    ];
  
    return (
      <Card className="border bg-white">
        <CardHeader className="border-b">
          <CardTitle>社交媒体链接</CardTitle>
          <CardDescription>设置显示在你网站页脚的社交媒体链接</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-6">
          {socialLinks.map(({ id, label, placeholder }) => (
            <div key={id} className="grid gap-2">
              <Label htmlFor={id}>{label}</Label>
              <Input
                id={id}
                name={id}
                value={settings[id] || ""}
                onChange={handleChange}
                placeholder={placeholder}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  export default SocialMediaCard;