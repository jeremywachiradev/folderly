import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, Modal, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme-provider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DeveloperTag = () => {
  const { isDarkMode } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const fullNameOpacity = useRef(new Animated.Value(0)).current;
  const jeriraOpacity = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Colors of Kenyan flag: Black, Red, Green, White
  const kenyaBlack = '#000000';
  const kenyaRed = '#BB0000';
  const kenyaGreen = '#006600';
  const kenyaWhite = '#FFFFFF';

  // Text shadow for better readability of dark text
  const textShadow = {
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  };

  // For dark mode, invert the text shadow
  const darkModeTextShadow = {
    textShadowColor: 'rgba(255, 255, 255, 0.7)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 2,
  };

  useEffect(() => {
    if (modalVisible) {
      startAnimation();
      startPulseAnimation();
    } else {
      resetAnimation();
    }
  }, [modalVisible]);

  const startAnimation = () => {
    // Reset animation values
    animation.setValue(0);
    fullNameOpacity.setValue(0);
    jeriraOpacity.setValue(1);

    // Create looping animation
    Animated.loop(
      Animated.sequence([
        // Step 1: Show JERIRA only
        Animated.parallel([
          Animated.timing(jeriraOpacity, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(fullNameOpacity, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        
        // Hold JERIRA state for 1.5 seconds
        Animated.delay(1500),
        
        // Step 2: Crossfade from JERIRA to JEREMY WACHIRA
        Animated.parallel([
          Animated.timing(jeriraOpacity, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(fullNameOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        
        // Step 3: Hold JEREMY WACHIRA state for 2 seconds
        Animated.delay(2000),
        
        // Step 4: Crossfade back to JERIRA
        Animated.parallel([
          Animated.timing(jeriraOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(fullNameOpacity, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        
        // Step 5: Hold JERIRA state for 1 second before restarting loop
        Animated.delay(1000),
      ]),
      { iterations: -1 }
    ).start();
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const resetAnimation = () => {
    animation.stopAnimation();
    fullNameOpacity.stopAnimation();
    jeriraOpacity.stopAnimation();
    scaleAnim.stopAnimation();
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={[
          styles.tagButton,
          { 
            backgroundColor: isDarkMode ? '#1f1f1f' : '#f5f5f5',
            shadowColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.2)'
          }
        ]}
      >
        <View style={styles.kenyaFlagBorder}>
          <View style={[styles.borderSegment, { backgroundColor: kenyaBlack }]} />
          <View style={[styles.borderSegment, { backgroundColor: kenyaRed }]} />
          <View style={[styles.borderSegment, { backgroundColor: kenyaGreen }]} />
          <View style={[styles.borderSegment, { backgroundColor: kenyaWhite, borderWidth: 1, borderColor: kenyaBlack }]} />
        </View>
        
        <Text style={{ color: isDarkMode ? '#ffffff' : '#000000', fontWeight: '500' }}>
          Developed with </Text><Ionicons
          name="heart"
          size={18}
          color={kenyaRed}
          style={{ marginRight: 6 }}
        />  <Text style={{ color: isDarkMode ? '#ffffff' : '#000000', fontWeight: '500' }}>in Kenya</Text>
        
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setModalVisible(false)}
        >
          <Animated.View 
            style={[
              styles.modalContent,
              { 
                backgroundColor: isDarkMode ? '#171717' : '#ffffff',
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            {/* Kenya flag-inspired decorative elements */}
            <View style={styles.decorationContainer}>
              <View style={[styles.decoration, { backgroundColor: kenyaBlack }]} />
              <View style={[styles.decoration, { backgroundColor: kenyaRed }]} />
              <View style={[styles.decoration, { backgroundColor: kenyaGreen }]} />
              <View style={[styles.decoration, { backgroundColor: kenyaWhite, borderWidth: 1, borderColor: kenyaBlack }]} />
            </View>

            <View style={styles.developerTagContainer}>
              <View style={styles.animationContainerWrapper}>
                <View style={styles.nameContainer}>
                  {/* JERIRA - All Black in compact mode */}
                  <Animated.View
                    style={[
                      styles.nameWrapper, 
                      { opacity: jeriraOpacity, position: 'absolute' }
                    ]}
                  >
                    <Text style={[
                      styles.nameText, 
                      { color: kenyaBlack },
                      isDarkMode ? darkModeTextShadow : textShadow
                    ]}>JERIRA</Text>
                  </Animated.View>

                  {/* JEREMY WACHIRA */}
                  <Animated.View 
                    style={[
                      styles.nameWrapper, 
                      { opacity: fullNameOpacity, position: 'absolute' }
                    ]}
                  >
                    <Text style={[
                      styles.nameText, 
                      { color: kenyaBlack },
                      isDarkMode ? darkModeTextShadow : textShadow
                    ]}>JER</Text>
                    <Text style={[styles.nameText, { color: kenyaRed }]}>EMY</Text>
                    <Text style={[styles.nameText, { color: kenyaGreen }]}>WACH</Text>
                    <Text style={[
                      styles.nameText, 
                      { color: kenyaBlack },
                      isDarkMode ? darkModeTextShadow : textShadow
                    ]}>IRA</Text>
                  </Animated.View>

                  {/* Invisible placeholder for consistent sizing */}
                  <View style={styles.nameWrapper}>
                    <Text style={[styles.nameText, { color: 'transparent' }]}>JEREMYWACHIRA</Text>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '85%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    overflow: 'hidden',
  },
  developerTagContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    position: 'relative',
    width: '100%',
  },
  animationContainerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  nameContainer: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  nameWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  nameText: {
    fontSize: 36,
    fontWeight: 'bold',
    paddingHorizontal: 0,
    textAlign: 'center',
  },
  decorationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: 6,
  },
  decoration: {
    flex: 1,
    height: 6,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  kenyaFlagBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: 3,
  },
  borderSegment: {
    flex: 1,
    height: 3,
  },
});

export default DeveloperTag; 