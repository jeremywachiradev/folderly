import { Text, View, SafeAreaView, FlatList, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import {config, database} from '../lib/appwrite'
import TextCustom from "./components/TextCustom";
import ListItem from "./components/ListItem";
import { client } from "../lib/appwrite";

export default function Index() {
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
      init()
  },[])

  const init = async () => {
    getData()
  }

  const getData = async () => {
    try{

      const {documents, total} = await database.listDocuments(config.db, config.col.tasks)
      setTasks(documents)
    }catch(error){
      console.log('ERROR:', error)
      setError(error)
    }
  }

  return (
    <SafeAreaView>
      <View style={styles.container}>
        {error && (<Text>{JSON.stringify(error)}</Text>)}
        <TextCustom style={styles.headline} fontSize={22}>Todo List:</TextCustom>
        <FlatList 
          data={tasks}
          renderItem={({item}) =><ListItem task={item} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{
    paddingHorizontal:20,

  },
  headline:{
    paddingVertical:20
  }
})