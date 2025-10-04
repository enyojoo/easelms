"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Save, 
  Download, 
  Upload,
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  Target,
  Clock,
  Zap,
  Beaker,
  Microscope,
  Code,
  Database,
  Network
} from "lucide-react"
import { toast } from "sonner"

interface VirtualLabProps {
  labType: "chemistry" | "physics" | "biology" | "programming" | "network" | "database"
  title: string
  description: string
  objectives: string[]
  equipment: LabEquipment[]
  procedures: LabProcedure[]
  onComplete?: (results: LabResults) => void
}

interface LabEquipment {
  id: string
  name: string
  type: "tool" | "chemical" | "instrument" | "container"
  icon: string
  description: string
  isAvailable: boolean
  position: { x: number; y: number }
}

interface LabProcedure {
  id: string
  step: number
  title: string
  description: string
  instructions: string[]
  expectedResult?: string
  isCompleted: boolean
  isCurrent: boolean
}

interface LabResults {
  score: number
  completedSteps: number
  totalSteps: number
  timeSpent: number
  accuracy: number
  observations: string[]
}

export default function VirtualLab({ 
  labType, 
  title, 
  description, 
  objectives, 
  equipment, 
  procedures,
  onComplete 
}: VirtualLabProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [labState, setLabState] = useState<LabResults>({
    score: 0,
    completedSteps: 0,
    totalSteps: procedures.length,
    timeSpent: 0,
    accuracy: 0,
    observations: []
  })
  const [selectedEquipment, setSelectedEquipment] = useState<LabEquipment[]>([])
  const [labNotes, setLabNotes] = useState("")
  const [showHints, setShowHints] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [activeTab, setActiveTab] = useState("procedure")

  const labRef = useRef<HTMLDivElement>(null)

  const labIcons = {
    chemistry: Beaker,
    physics: Zap,
    biology: Microscope,
    programming: Code,
    network: Network,
    database: Database
  }

  const LabIcon = labIcons[labType] || Beaker

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning) {
      interval = setInterval(() => {
        setLabState(prev => ({
          ...prev,
          timeSpent: prev.timeSpent + 1
        }))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning])

  const startLab = () => {
    setIsRunning(true)
    setCurrentStep(0)
    setLabState(prev => ({
      ...prev,
      score: 0,
      completedSteps: 0,
      timeSpent: 0,
      observations: []
    }))
    toast.success("Lab session started!")
  }

  const pauseLab = () => {
    setIsRunning(false)
    toast.info("Lab session paused")
  }

  const resetLab = () => {
    setIsRunning(false)
    setCurrentStep(0)
    setSelectedEquipment([])
    setLabNotes("")
    setLabState({
      score: 0,
      completedSteps: 0,
      totalSteps: procedures.length,
      timeSpent: 0,
      accuracy: 0,
      observations: []
    })
    toast.info("Lab reset")
  }

  const completeStep = () => {
    const newCompletedSteps = labState.completedSteps + 1
    const newScore = Math.round((newCompletedSteps / procedures.length) * 100)
    
    setLabState(prev => ({
      ...prev,
      completedSteps: newCompletedSteps,
      score: newScore
    }))

    if (newCompletedSteps === procedures.length) {
      setIsCompleted(true)
      setIsRunning(false)
      onComplete?.(labState)
      toast.success("Lab completed successfully! 🎉")
    } else {
      setCurrentStep(prev => prev + 1)
      toast.success("Step completed! Moving to next step.")
    }
  }

  const addObservation = (observation: string) => {
    if (observation.trim()) {
      setLabState(prev => ({
        ...prev,
        observations: [...prev.observations, observation]
      }))
      setLabNotes("")
      toast.success("Observation added")
    }
  }

  const selectEquipment = (equipment: LabEquipment) => {
    if (equipment.isAvailable) {
      setSelectedEquipment(prev => {
        if (prev.find(eq => eq.id === equipment.id)) {
          return prev.filter(eq => eq.id !== equipment.id)
        } else {
          return [...prev, equipment]
        }
      })
    } else {
      toast.error("This equipment is not available")
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const renderLabEnvironment = () => (
    <div className="space-y-4">
      {/* Lab Workspace */}
      <div className="relative bg-gray-100 rounded-lg p-6 min-h-64">
        <h3 className="font-semibold mb-4">Lab Workspace</h3>
        
        {/* Equipment Grid */}
        <div className="grid grid-cols-4 gap-4">
          {equipment.map((eq) => (
            <div
              key={eq.id}
              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                eq.isAvailable 
                  ? "border-gray-300 hover:border-blue-500 hover:bg-blue-50" 
                  : "border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed"
              } ${
                selectedEquipment.find(e => e.id === eq.id) 
                  ? "border-blue-500 bg-blue-50" 
                  : ""
              }`}
              onClick={() => selectEquipment(eq)}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">{eq.icon}</div>
                <div className="text-sm font-medium">{eq.name}</div>
                <div className="text-xs text-gray-500">{eq.type}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Equipment */}
        {selectedEquipment.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">Selected Equipment:</h4>
            <div className="flex flex-wrap gap-2">
              {selectedEquipment.map((eq) => (
                <Badge key={eq.id} variant="secondary">
                  {eq.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Current Procedure */}
      {procedures[currentStep] && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Step {procedures[currentStep].step}: {procedures[currentStep].title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {procedures[currentStep].description}
            </p>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Instructions:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                {procedures[currentStep].instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            </div>

            {procedures[currentStep].expectedResult && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-sm text-green-800">Expected Result:</h4>
                <p className="text-sm text-green-700">{procedures[currentStep].expectedResult}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={completeStep} disabled={!isRunning}>
                Complete Step
              </Button>
              <Button variant="outline" onClick={() => setShowHints(!showHints)}>
                <Lightbulb className="h-4 w-4 mr-1" />
                Hints
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderObservations = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lab Observations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Observation */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Add Observation</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={labNotes}
                onChange={(e) => setLabNotes(e.target.value)}
                placeholder="Record your observations..."
                className="flex-1 px-3 py-2 border rounded-lg"
                onKeyPress={(e) => e.key === 'Enter' && addObservation(labNotes)}
              />
              <Button onClick={() => addObservation(labNotes)}>
                Add
              </Button>
            </div>
          </div>

          {/* Observations List */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Recorded Observations:</h4>
            {labState.observations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No observations recorded yet</p>
            ) : (
              <div className="space-y-2">
                {labState.observations.map((observation, index) => (
                  <div key={index} className="p-2 bg-gray-50 border rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span>{observation}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderResults = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lab Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{labState.score}%</div>
              <div className="text-sm text-blue-600">Completion Score</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{formatTime(labState.timeSpent)}</div>
              <div className="text-sm text-green-600">Time Spent</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{labState.completedSteps}/{labState.totalSteps} steps</span>
            </div>
            <Progress value={(labState.completedSteps / labState.totalSteps) * 100} />
          </div>

          {isCompleted && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">Lab Completed Successfully!</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Great job! You've completed all the lab procedures.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LabIcon className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle className="text-xl">{title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isCompleted ? "default" : "secondary"}>
                {isCompleted ? "Completed" : "In Progress"}
              </Badge>
              <Badge variant="outline">{labType.toUpperCase()}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Learning Objectives:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {objectives.map((objective, index) => (
                <li key={index}>{objective}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isRunning ? (
                <Button onClick={startLab} disabled={isCompleted}>
                  <Play className="h-4 w-4 mr-1" />
                  Start Lab
                </Button>
              ) : (
                <Button onClick={pauseLab}>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              )}
              <Button variant="outline" onClick={resetLab}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button variant="outline">
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Time: {formatTime(labState.timeSpent)}</span>
              <span>Score: {labState.score}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="procedure">Procedure</TabsTrigger>
          <TabsTrigger value="observations">Observations</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="procedure">
          {renderLabEnvironment()}
        </TabsContent>

        <TabsContent value="observations">
          {renderObservations()}
        </TabsContent>

        <TabsContent value="results">
          {renderResults()}
        </TabsContent>
      </Tabs>

      {/* Hints */}
      {showHints && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-800">Lab Hints</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Make sure to follow the procedure steps carefully. 
                  Record all observations as you go. 
                  If you make a mistake, you can reset the lab and try again.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
