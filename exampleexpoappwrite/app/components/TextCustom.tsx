import { View, Text } from 'react-native'
import React from 'react'

const TextCustom = ({style, fontSize=16, children}) => {
  return (
      <Text style={{...style, fontSize}}>{children}</Text>
  )
}

export default TextCustom