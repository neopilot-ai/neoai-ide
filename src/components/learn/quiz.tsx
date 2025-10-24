'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { QuizQuestion } from '@/app/lib/actions/learn/quiz'

export default function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<{[key: number]: string}>({})
  
  const handleAnswerSubmit = (answer: string, questionIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }))
  }
  
  const getAnswerStatus = (questionIndex: number) => {
    if (!answers[questionIndex]) return null
    if (questions[questionIndex].correctAnswer === 'A' && questions[questionIndex].options[0] === answers[questionIndex]) {
      return true
    }
    if (questions[questionIndex].correctAnswer === 'B' && questions[questionIndex].options[1] === answers[questionIndex]) {
      return true
    }
    if (questions[questionIndex].correctAnswer === 'C' && questions[questionIndex].options[2] === answers[questionIndex]) {
      return true
    }
    if (questions[questionIndex].correctAnswer === 'D' && questions[questionIndex].options[3] === answers[questionIndex]) {
      return true
    }
    
    return false
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-gray-100">Quiz</CardTitle>
      </CardHeader>
      <CardContent>
        {!questions || questions.length === 0 ? (
          <div className="flex justify-center items-center min-h-32">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-8">
            {questions.map((question, index) => (
              <div key={index} className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Question {index + 1}: {question.question}
                </h2>
                <RadioGroup
                  onValueChange={(value) => handleAnswerSubmit(value, index)}
                  value={answers[index]}
                >
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`q${index}-option-${optionIndex}`} />
                      <Label 
                        htmlFor={`q${index}-option-${optionIndex}`}
                        className="text-gray-900 dark:text-gray-100"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                
                {answers[index] && (
                  <Alert 
                    className={
                      getAnswerStatus(index)
                        ? "bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100"
                        : "bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100"
                    }
                  >
                    <AlertDescription>
                      {getAnswerStatus(index)
                        ? "Correct! "
                        : `Incorrect. The correct answer is ${question.correctAnswer}. `}
                      {question.explanation}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}