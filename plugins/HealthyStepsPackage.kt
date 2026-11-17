package com.healthy.securehealth

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.ViewManager

class HealthyStepsPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
    listOf(HealthyStepsModule(context))

  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}

private class HealthyStepsModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context), SensorEventListener {
  private val manager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
  private val handler = Handler(Looper.getMainLooper())
  private var generation = 0
  private var boot = -1

  override fun getName() = "HealthySteps"

  @ReactMethod fun start(run: Int, promise: Promise) {
    handler.post {
      manager.unregisterListener(this)
      generation = run
      val counter = manager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
      if (counter == null) {
        promise.resolve(false)
        return@post
      }
      try {
        boot = Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, -1)
        promise.resolve(manager.registerListener(this, counter, SensorManager.SENSOR_DELAY_NORMAL, handler))
      } catch (error: Exception) {
        promise.reject("STEPS_START", error)
      }
    }
  }

  @ReactMethod fun stop() { handler.post { manager.unregisterListener(this) } }
  @ReactMethod fun addListener(eventName: String) {}
  @ReactMethod fun removeListeners(count: Int) {}

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

  override fun onSensorChanged(event: SensorEvent) {
    if (!context.hasActiveReactInstance()) return
    val values = Arguments.createMap().apply {
      putDouble("count", event.values[0].toDouble())
      putInt("boot", boot)
      putInt("run", generation)
    }
    context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit("HealthyStepCounter", values)
  }

  override fun invalidate() {
    handler.post { manager.unregisterListener(this) }
    super.invalidate()
  }
}
