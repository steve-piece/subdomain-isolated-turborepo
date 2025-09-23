"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Badge } from "@workspace/ui/components/badge";
import { Copy, ExternalLink, Code, FileText, Settings } from "lucide-react";

interface DeeplinkConfig {
  type: "file" | "folder" | "search" | "chat" | "composer";
  path?: string;
  query?: string;
  line?: number;
  column?: number;
  selection?: {
    start: number;
    end: number;
  };
  chatId?: string;
  composerPrompt?: string;
}

export default function DeeplinksPage() {
  const [config, setConfig] = useState<DeeplinkConfig>({
    type: "file",
    path: "",
    query: "",
    line: 1,
    column: 1,
    selection: { start: 0, end: 0 },
    chatId: "",
    composerPrompt: "",
  });

  const [generatedUrl, setGeneratedUrl] = useState("");
  const [isValid, setIsValid] = useState(false);

  const generateDeeplink = () => {
    let url = "cursor://";

    switch (config.type) {
      case "file":
        if (config.path) {
          url += `file/${encodeURIComponent(config.path)}`;
          if (config.line) {
            url += `:${config.line}`;
            if (config.column) {
              url += `:${config.column}`;
            }
          }
          if (
            config.selection &&
            config.selection.start !== config.selection.end
          ) {
            url += `?selection=${config.selection.start}-${config.selection.end}`;
          }
        }
        break;

      case "folder":
        if (config.path) {
          url += `folder/${encodeURIComponent(config.path)}`;
        }
        break;

      case "search":
        if (config.query) {
          url += `search/${encodeURIComponent(config.query)}`;
        }
        break;

      case "chat":
        if (config.chatId) {
          url += `chat/${config.chatId}`;
        }
        break;

      case "composer":
        url += "composer";
        if (config.composerPrompt) {
          url += `?prompt=${encodeURIComponent(config.composerPrompt)}`;
        }
        break;
    }

    setGeneratedUrl(url);
    setIsValid(url !== "cursor://");
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      // You could add a toast notification here
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const openDeeplink = () => {
    if (generatedUrl && isValid) {
      window.open(generatedUrl, "_blank");
    }
  };

  const exampleConfigs = [
    {
      name: "Open File with Line",
      description: "Open a specific file at a specific line",
      config: {
        type: "file" as const,
        path: "/Users/username/project/src/components/Button.tsx",
        line: 25,
        column: 1,
      },
    },
    {
      name: "Open Folder",
      description: "Open a folder in Cursor",
      config: {
        type: "folder" as const,
        path: "/Users/username/project/src",
      },
    },
    {
      name: "Search in Project",
      description: "Search for text in the project",
      config: {
        type: "search" as const,
        query: "useState",
      },
    },
    {
      name: "Composer with Prompt",
      description: "Open composer with a pre-filled prompt",
      config: {
        type: "composer" as const,
        composerPrompt: "Create a React component for user authentication",
      },
    },
  ];

  const loadExample = (example: (typeof exampleConfigs)[0]) => {
    setConfig(example.config);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Cursor Deeplinks Generator</h1>
        <p className="text-muted-foreground">
          Generate and test Cursor deeplinks for seamless integration with your
          development workflow.
        </p>
      </div>

      <Tabs defaultValue="generator" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generator">Generator</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
          <TabsTrigger value="docs">Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configure Deeplink
              </CardTitle>
              <CardDescription>
                Set up your deeplink parameters and generate the URL
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Deeplink Type</Label>
                  <Select
                    value={config.type}
                    onValueChange={(value: DeeplinkConfig["type"]) =>
                      setConfig((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="file">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          File
                        </div>
                      </SelectItem>
                      <SelectItem value="folder">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4" />
                          Folder
                        </div>
                      </SelectItem>
                      <SelectItem value="search">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4" />
                          Search
                        </div>
                      </SelectItem>
                      <SelectItem value="chat">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4" />
                          Chat
                        </div>
                      </SelectItem>
                      <SelectItem value="composer">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4" />
                          Composer
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(config.type === "file" || config.type === "folder") && (
                  <div className="space-y-2">
                    <Label htmlFor="path">File/Folder Path</Label>
                    <Input
                      id="path"
                      placeholder="/path/to/file.tsx"
                      value={config.path || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setConfig((prev) => ({ ...prev, path: e.target.value }))
                      }
                    />
                  </div>
                )}

                {config.type === "search" && (
                  <div className="space-y-2">
                    <Label htmlFor="query">Search Query</Label>
                    <Input
                      id="query"
                      placeholder="useState"
                      value={config.query || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setConfig((prev) => ({
                          ...prev,
                          query: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}

                {config.type === "chat" && (
                  <div className="space-y-2">
                    <Label htmlFor="chatId">Chat ID</Label>
                    <Input
                      id="chatId"
                      placeholder="chat-123"
                      value={config.chatId || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setConfig((prev) => ({
                          ...prev,
                          chatId: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}

                {config.type === "composer" && (
                  <div className="space-y-2">
                    <Label htmlFor="composerPrompt">Composer Prompt</Label>
                    <Textarea
                      id="composerPrompt"
                      placeholder="Create a React component for user authentication"
                      value={config.composerPrompt || ""}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setConfig((prev) => ({
                          ...prev,
                          composerPrompt: e.target.value,
                        }))
                      }
                      rows={3}
                    />
                  </div>
                )}
              </div>

              {config.type === "file" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="line">Line Number</Label>
                    <Input
                      id="line"
                      type="number"
                      min="1"
                      value={config.line || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setConfig((prev) => ({
                          ...prev,
                          line: parseInt(e.target.value) || 1,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="column">Column Number</Label>
                    <Input
                      id="column"
                      type="number"
                      min="1"
                      value={config.column || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setConfig((prev) => ({
                          ...prev,
                          column: parseInt(e.target.value) || 1,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="selection">Selection Range</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Start"
                        type="number"
                        min="0"
                        value={config.selection?.start || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setConfig((prev) => ({
                            ...prev,
                            selection: {
                              ...prev.selection!,
                              start: parseInt(e.target.value) || 0,
                            },
                          }))
                        }
                      />
                      <Input
                        placeholder="End"
                        type="number"
                        min="0"
                        value={config.selection?.end || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setConfig((prev) => ({
                            ...prev,
                            selection: {
                              ...prev.selection!,
                              end: parseInt(e.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={generateDeeplink} className="flex-1">
                  Generate Deeplink
                </Button>
              </div>

              {generatedUrl && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Generated Deeplink
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                        {generatedUrl}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={copyToClipboard}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={openDeeplink}
                        disabled={!isValid}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                    {isValid && (
                      <Badge variant="secondary" className="mt-2">
                        Valid deeplink
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Example Configurations</CardTitle>
              <CardDescription>
                Click on any example to load it into the generator
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {exampleConfigs.map((example, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <CardContent
                      className="p-4"
                      onClick={() => loadExample(example)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{example.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {example.description}
                          </p>
                        </div>
                        <Badge variant="outline">{example.config.type}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Deeplink Documentation</CardTitle>
              <CardDescription>
                Understanding Cursor deeplinks and their usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">File Deeplinks</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Open specific files at specific lines and columns
                </p>
                <code className="text-xs bg-muted p-2 rounded block">
                  cursor://file/path/to/file.tsx:25:10?selection=100-150
                </code>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Folder Deeplinks</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Open folders in Cursor
                </p>
                <code className="text-xs bg-muted p-2 rounded block">
                  cursor://folder/path/to/project
                </code>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Search Deeplinks</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Search for text within the project
                </p>
                <code className="text-xs bg-muted p-2 rounded block">
                  cursor://search/useState
                </code>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Composer Deeplinks</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Open the composer with a pre-filled prompt
                </p>
                <code className="text-xs bg-muted p-2 rounded block">
                  cursor://composer?prompt=Create a React component
                </code>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Chat Deeplinks</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Open specific chat conversations
                </p>
                <code className="text-xs bg-muted p-2 rounded block">
                  cursor://chat/chat-id-123
                </code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
