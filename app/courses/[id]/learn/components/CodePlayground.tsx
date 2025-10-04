"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Play, 
  RotateCcw, 
  Download, 
  Upload, 
  Share2, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Code,
  FileText,
  Terminal,
  Settings,
  Lightbulb,
  Bug
} from "lucide-react"
import { toast } from "sonner"

interface CodePlaygroundProps {
  language: string
  initialCode?: string
  expectedOutput?: string
  hints?: string[]
  onCodeChange?: (code: string) => void
  onTestPass?: () => void
}

interface CodeResult {
  output: string
  error: string
  executionTime: number
  memoryUsage: number
}

interface CodeTest {
  id: string
  name: string
  input: string
  expectedOutput: string
  passed: boolean
  actualOutput: string
}

export default function CodePlayground({ 
  language, 
  initialCode = "", 
  expectedOutput,
  hints = [],
  onCodeChange,
  onTestPass 
}: CodePlaygroundProps) {
  const [code, setCode] = useState(initialCode)
  const [result, setResult] = useState<CodeResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState(language)
  const [showHints, setShowHints] = useState(false)
  const [tests, setTests] = useState<CodeTest[]>([])
  const [activeTab, setActiveTab] = useState("code")
  const [fontSize, setFontSize] = useState(14)
  const [theme, setTheme] = useState("light")
  const [showSettings, setShowSettings] = useState(false)

  const codeEditorRef = useRef<HTMLTextAreaElement>(null)

  const languages = [
    { value: "javascript", label: "JavaScript", icon: "🟨" },
    { value: "python", label: "Python", icon: "🐍" },
    { value: "java", label: "Java", icon: "☕" },
    { value: "cpp", label: "C++", icon: "⚡" },
    { value: "csharp", label: "C#", icon: "🔷" },
    { value: "go", label: "Go", icon: "🐹" },
    { value: "rust", label: "Rust", icon: "🦀" },
    { value: "php", label: "PHP", icon: "🐘" }
  ]

  const themes = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "monokai", label: "Monokai" },
    { value: "github", label: "GitHub" }
  ]

  const defaultCode = {
    javascript: `// Welcome to JavaScript Playground!
function greet(name) {
    return \`Hello, \${name}!\`;
}

// Test your function
console.log(greet("World"));`,
    python: `# Welcome to Python Playground!
def greet(name):
    return f"Hello, {name}!"

# Test your function
print(greet("World"))`,
    java: `// Welcome to Java Playground!
public class Main {
    public static void main(String[] args) {
        System.out.println(greet("World"));
    }
    
    public static String greet(String name) {
        return "Hello, " + name + "!";
    }
}`,
    cpp: `// Welcome to C++ Playground!
#include <iostream>
#include <string>

std::string greet(std::string name) {
    return "Hello, " + name + "!";
}

int main() {
    std::cout << greet("World") << std::endl;
    return 0;
}`
  }

  useEffect(() => {
    if (!code && initialCode) {
      setCode(initialCode)
    } else if (!code) {
      setCode(defaultCode[selectedLanguage as keyof typeof defaultCode] || "")
    }
  }, [selectedLanguage, initialCode])

  const runCode = async () => {
    if (!code.trim()) {
      toast.error("Please enter some code to run")
      return
    }

    setIsRunning(true)
    setResult(null)

    try {
      // Simulate code execution (in real app, this would call your backend)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Mock execution result
      const mockResult: CodeResult = {
        output: "Hello, World!\nCode executed successfully!",
        error: "",
        executionTime: Math.random() * 100 + 50,
        memoryUsage: Math.random() * 1024 + 512
      }

      setResult(mockResult)

      // Check if output matches expected
      if (expectedOutput && mockResult.output.includes(expectedOutput)) {
        toast.success("Test passed! 🎉")
        onTestPass?.()
      }

      // Run tests
      runTests(mockResult.output)

    } catch (error) {
      setResult({
        output: "",
        error: "Execution failed: " + (error as Error).message,
        executionTime: 0,
        memoryUsage: 0
      })
      toast.error("Code execution failed")
    } finally {
      setIsRunning(false)
    }
  }

  const runTests = (actualOutput: string) => {
    // Mock test cases
    const mockTests: CodeTest[] = [
      {
        id: "1",
        name: "Basic Function Test",
        input: "World",
        expectedOutput: "Hello, World!",
        passed: actualOutput.includes("Hello, World!"),
        actualOutput: actualOutput
      },
      {
        id: "2", 
        name: "Empty Input Test",
        input: "",
        expectedOutput: "Hello, !",
        passed: actualOutput.includes("Hello, !"),
        actualOutput: actualOutput
      }
    ]

    setTests(mockTests)
  }

  const resetCode = () => {
    setCode(defaultCode[selectedLanguage as keyof typeof defaultCode] || "")
    setResult(null)
    setTests([])
    toast.info("Code reset to default")
  }

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `code.${selectedLanguage}`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Code downloaded")
  }

  const shareCode = () => {
    const shareData = {
      title: "Code Playground",
      text: `Check out this ${selectedLanguage} code!`,
      url: window.location.href
    }

    if (navigator.share) {
      navigator.share(shareData)
    } else {
      navigator.clipboard.writeText(code)
      toast.success("Code copied to clipboard")
    }
  }

  const formatCode = () => {
    // Simple formatting (in real app, use a proper formatter)
    const formatted = code
      .split('\n')
      .map(line => line.trim())
      .join('\n')
    
    setCode(formatted)
    toast.success("Code formatted")
  }

  const handleCodeChange = (newCode: string) => {
    setCode(newCode)
    onCodeChange?.(newCode)
  }

  const getLanguageIcon = (lang: string) => {
    const language = languages.find(l => l.value === lang)
    return language?.icon || "💻"
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            <span className="font-semibold">Code Playground</span>
            <Badge variant="outline">{getLanguageIcon(selectedLanguage)} {selectedLanguage.toUpperCase()}</Badge>
          </div>
          
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  <span className="flex items-center gap-2">
                    <span>{lang.icon}</span>
                    <span>{lang.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowHints(!showHints)}
            disabled={hints.length === 0}
          >
            <Lightbulb className="h-4 w-4 mr-1" />
            Hints ({hints.length})
          </Button>

          <Button size="sm" variant="outline" onClick={formatCode}>
            Format
          </Button>
          
          <Button size="sm" variant="outline" onClick={resetCode}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          
          <Button size="sm" variant="outline" onClick={downloadCode}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          
          <Button size="sm" variant="outline" onClick={shareCode}>
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
          
          <Button 
            size="sm" 
            onClick={runCode} 
            disabled={isRunning || !code.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {isRunning ? (
              <>
                <Clock className="h-4 w-4 mr-1 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Run Code
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Code Editor */}
        <div className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="output">Output</TabsTrigger>
              <TabsTrigger value="tests">Tests</TabsTrigger>
            </TabsList>

            <TabsContent value="code" className="flex-1 m-0">
              <div className="h-full relative">
                <textarea
                  ref={codeEditorRef}
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="w-full h-full p-4 font-mono text-sm border-0 resize-none focus:outline-none"
                  style={{ 
                    fontSize: `${fontSize}px`,
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                  }}
                  placeholder="Enter your code here..."
                  spellCheck={false}
                />
                
                {/* Line Numbers */}
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-100 border-r text-gray-500 text-xs font-mono p-4 select-none">
                  {code.split('\n').map((_, i) => (
                    <div key={i} className="leading-6">
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="output" className="flex-1 m-0">
              <div className="h-full p-4 bg-black text-green-400 font-mono text-sm overflow-auto">
                {isRunning ? (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    <span>Executing code...</span>
                  </div>
                ) : result ? (
                  <div className="space-y-2">
                    {result.error ? (
                      <div className="text-red-400">
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle className="h-4 w-4" />
                          <span className="font-semibold">Error:</span>
                        </div>
                        <pre className="whitespace-pre-wrap">{result.error}</pre>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                          <span className="font-semibold">Output:</span>
                        </div>
                        <pre className="whitespace-pre-wrap">{result.output}</pre>
                        <div className="mt-4 text-xs text-gray-400 space-y-1">
                          <div>Execution time: {result.executionTime.toFixed(2)}ms</div>
                          <div>Memory usage: {result.memoryUsage.toFixed(2)}KB</div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500">No output yet. Run your code to see results.</div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="tests" className="flex-1 m-0">
              <div className="h-full p-4 overflow-auto">
                {tests.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    No tests available. Run your code to see test results.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tests.map((test) => (
                      <Card key={test.id} className={`p-4 ${test.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {test.passed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <span className="font-semibold">{test.name}</span>
                          <Badge variant={test.passed ? "default" : "destructive"}>
                            {test.passed ? "PASSED" : "FAILED"}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Input:</span>
                            <code className="ml-2 px-2 py-1 bg-gray-100 rounded">{test.input}</code>
                          </div>
                          <div>
                            <span className="font-medium">Expected:</span>
                            <code className="ml-2 px-2 py-1 bg-gray-100 rounded">{test.expectedOutput}</code>
                          </div>
                          <div>
                            <span className="font-medium">Actual:</span>
                            <code className="ml-2 px-2 py-1 bg-gray-100 rounded">{test.actualOutput}</code>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Side Panels */}
        <div className="w-80 border-l bg-gray-50">
          {/* Settings Panel */}
          {showSettings && (
            <Card className="m-4">
              <CardHeader>
                <CardTitle className="text-sm">Editor Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Font Size</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="range"
                      min="10"
                      max="20"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500">{fontSize}px</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Theme</label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {themes.map((themeOption) => (
                        <SelectItem key={themeOption.value} value={themeOption.value}>
                          {themeOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hints Panel */}
          {showHints && hints.length > 0 && (
            <Card className="m-4">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Hints
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {hints.map((hint, index) => (
                    <div key={index} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                      {hint}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
