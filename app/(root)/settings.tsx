import { View, Text,  } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React from 'react'

const settings = () => {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900 p-4   "    >
      <Text className="text-2xl font-bold text-center text-neutral-900 dark:text-white">settings</Text>
    </SafeAreaView>
  )
}

export default settings