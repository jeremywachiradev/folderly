import { View, Text, StyleSheet } from 'react-native'
import { useState } from 'react'
import React from 'react'
import TextCustom from './TextCustom'
import Checkbox from 'expo-checkbox'
import {database, config} from '../../lib/appwrite'

const ListItem = ({task}) => {
    const {body, $id, complete} = task
    const [check, setCheck] = useState(complete)

    const handleUpdate = async () => {
        try{
            database.updateDocument(config.db, config.col.tasks, $id, {complete:!complete})
            setCheck(!check)
        }catch(error){
            console.log(error)
        }
    }

  return (
    <View style={styles.itemWrapper}>
      <Checkbox value={check} onValueChange={handleUpdate}/>
      <TextCustom fontSize={18}>{body}</TextCustom>
    </View>
  )
}

const styles = StyleSheet.create({
    itemWrapper:{
        display:'flex',
        flexDirection:'row',
        alignItems:'flex-start',
        gap:10,
        paddingHorizontal:15,
        paddingVertical:5
    }
})

export default ListItem