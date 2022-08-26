function settingsComponent(props) {
  return (
    <Page>
      <Section
        title = {<Text bold align="center">Status</Text>}
      />
        <Text bold align='center'>{props.settingsStorage.getItem('appStatusText')}
          <Text bold align='center'>{props.settingsStorage.getItem('logStatusText')}</Text>
          <Text bold align='center'>{props.settingsStorage.getItem('xferStatusText')}</Text>
        </Text>

      <Section
        title = {<Text bold align="center">Operation</Text>}
      />
        <Button
          settingsKey = 'logBtn'
          label = {props.settingsStorage.getItem('logBtnLabel')}
          onClick = {
            () => {
              console.log('Settings: logBtn click');
              props.settingsStorage.setItem('logBtnClick',
                                            (!(props.settingsStorage.getItem("logBtnClick") === 'true')).toString())
            }
          }
        />
        <Button
          settingsKey = 'xferBtn'
          label = {props.settingsStorage.getItem('xferBtnLabel')}
          onClick = {
            () => {
              console.log('Settings: xferBtn click');
              props.settingsStorage.setItem('xferBtnClick',
                                            (!(props.settingsStorage.getItem("xferBtnClick") === 'true')).toString())
            }
          }
        />
        <Button
          settingsKey = 'resetLogBtn'
          label = {props.settingsStorage.getItem('resetLogBtnLabel')}
          onClick = {
            () => {
              console.log('Settings: resetLogBtn click');
              props.settingsStorage.setItem('resetLogBtnClick',
                                            (!(props.settingsStorage.getItem("resetLogBtnClick") === 'true')).toString())
            }
          }
        />
        <Button
          settingsKey = 'resetXferBtn'
          label = {props.settingsStorage.getItem('resetXferBtnLabel')}
          onClick = {
            () => {
              console.log('Settings: resetXferBtn click');
              props.settingsStorage.setItem('resetXferBtnClick',
                                            (!(props.settingsStorage.getItem("resetXferBtnClick") === 'true')).toString())
            }
          }
        />

      <Section
        title = {<Text bold align="center">Configuration</Text>}
      />
        <Select
          title={null}
          selectViewTitle="Log Start Time"
          label="Log Start Time"
          settingsKey="logStartTime"
          options={
            [
              {name:"6pm", value: "18" },
              {name:"7pm", value: "19" },
              {name:"8pm", value: "20" },
              {name:"9pm", value: "21" },
              {name:"10pm", value: "22" },
              {name:"11pm", value: "23" },
              {name:"12am", value: "0" },
              {name:"1am", value: "1" },
              {name:"2am", value: "2" },
              {name:"3am", value: "3" },
              {name:"4am", value: "4" },
              {name:"5am", value: "5" },
              {name:"6am", value: "6" },
              {name:"7am", value: "7" },
              {name:"8am", value: "8" },
              {name:"9am", value: "9" },
              {name:"10am", value: "10" },
              {name:"11am", value: "11" },
              {name:"12pm", value: "12" },
              {name:"1pm", value: "13" },
              {name:"2pm", value: "14" },
              {name:"3pm", value: "15" },
              {name:"4pm", value: "16" },
              {name:"5pm", value: "17" }
            ]
          }
        />
        <Select
          title={null}
          selectViewTitle="Log Stop Time"
          label="Log Stop Time"
          settingsKey="logStopTime"
          options={
            [
              {name:"6pm", value: "18" },
              {name:"7pm", value: "19" },
              {name:"8pm", value: "20" },
              {name:"9pm", value: "21" },
              {name:"10pm", value: "22" },
              {name:"11pm", value: "23" },
              {name:"12am", value: "0" },
              {name:"1am", value: "1" },
              {name:"2am", value: "2" },
              {name:"3am", value: "3" },
              {name:"4am", value: "4" },
              {name:"5am", value: "5" },
              {name:"6am", value: "6" },
              {name:"7am", value: "7" },
              {name:"8am", value: "8" },
              {name:"9am", value: "9" },
              {name:"10am", value: "10" },
              {name:"11am", value: "11" },
              {name:"12pm", value: "12" },
              {name:"1pm", value: "13" },
              {name:"2pm", value: "14" },
              {name:"3pm", value: "15" },
              {name:"4pm", value: "16" },
              {name:"5pm", value: "17" }
            ]
          }
        />
        <Select
          title={null}
          selectViewTitle="Accel Frequency"
          label="Accelerometer Frequency"
          settingsKey="accelFreq"
          options={
            [
              {name:"0"},
              {name:"1"},
              {name:"2"},
              {name:"5"},
              {name:"10"},
              {name:"20"},
              {name:"25"},
              {name:"50"},
              {name:"100"}
            ]
          }
        />
        <Select
          title={null}
          selectViewTitle="Gyro Frequency"
          label="Gyroscope Frequency"
          settingsKey="gyroFreq"
          options={
            [
              {name:"0"},
              {name:"1"},
              {name:"2"},
              {name:"5"},
              {name:"10"},
              {name:"20"},
              {name:"25"},
              {name:"50"},
              {name:"100"}
            ]
          }
        />
        <Select
          title={null}
          selectViewTitle="Heart Frequency"
          label="Heart Rate Frequency"
          settingsKey="hrmFreq"
          options={
            [
              {name:"0"},
              {name:"1"},
            ]
          }
        />
        <Select
          title={null}
          selectViewTitle="Body Presence"
          label="Body Presence Sensor"
          settingsKey="bpsFreq"
          options={
            [
              {name:"0"},
              {name:"1"},
            ]
          }
        />
        <TextInput
          label="Server IP Address"
          settingsKey="serverIP"
        />
        <TextInput
          label="Server Port"
          settingsKey="serverPort"
        />
    </Page>
  );
}

registerSettingsPage(settingsComponent)
