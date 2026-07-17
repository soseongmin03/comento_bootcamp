const MAX_ALARM_COUNT = 3;

const state = {
  battery: 100,
  alarms: [],
};

const elements = {
  batteryLevel: document.querySelector("[data-battery-level]"),
  batteryText: document.querySelector("[data-battery-text]"),
  chargeButton: document.querySelector("[data-charge-button]"),
  clockScreen: document.querySelector("[data-clock-screen]"),
  clockTime: document.querySelector("[data-clock-time]"),
  clockLabel: document.querySelector("[data-clock-label]"),
  alarmForm: document.querySelector("[data-alarm-form]"),
  alarmList: document.querySelector("[data-alarm-list]"),
  alarmCount: document.querySelector("[data-alarm-count]"),
  emptyMessage: document.querySelector("[data-empty-message]"),
  statusMessage: document.querySelector("[data-status-message]"),
  notice: document.querySelector(".notice"),
};

function padTime(value) {
  return String(value).padStart(2, "0");
}

function getCurrentTimeParts() {
  const now = new Date();

  return {
    hour: now.getHours(),
    minute: now.getMinutes(),
    second: now.getSeconds(),
  };
}

function formatTime({ hour, minute, second }) {
  return `${padTime(hour)}:${padTime(minute)}:${padTime(second)}`;
}

function setStatus(message, type = "default") {
  elements.statusMessage.textContent = message;
  elements.notice.classList.remove("notice--success", "notice--warning", "notice--danger");

  if (type !== "default") {
    elements.notice.classList.add(`notice--${type}`);
  }
}

function updateBatteryView() {
  elements.batteryText.textContent = `${state.battery}%`;
  elements.batteryLevel.style.width = `${state.battery}%`;
  elements.batteryLevel.classList.toggle("battery__level--warning", state.battery <= 30 && state.battery > 10);
  elements.batteryLevel.classList.toggle("battery__level--danger", state.battery <= 10);
}

function updateClockView() {
  if (state.battery === 0) {
    elements.clockScreen.classList.add("clock-screen--dead");
    elements.clockTime.textContent = "";
    elements.clockTime.removeAttribute("datetime");
    elements.clockLabel.textContent = "";
    return;
  }

  const currentTime = getCurrentTimeParts();
  const formattedTime = formatTime(currentTime);

  elements.clockScreen.classList.remove("clock-screen--dead");
  elements.clockTime.textContent = formattedTime;
  elements.clockTime.setAttribute("datetime", formattedTime);
  elements.clockLabel.textContent = "시계가 동작 중입니다.";
}

function updateAlarmCount() {
  elements.alarmCount.textContent = `${state.alarms.length} / ${MAX_ALARM_COUNT}`;
}

function createAlarmItem(alarm) {
  const item = document.createElement("li");
  const time = document.createElement("span");
  const deleteButton = document.createElement("button");

  item.className = "alarm-list__item";
  time.className = "alarm-list__time";
  deleteButton.className = "alarm-list__delete";
  deleteButton.type = "button";
  deleteButton.dataset.alarmId = alarm.id;

  time.textContent = alarm.time;
  deleteButton.textContent = "삭제";
  deleteButton.setAttribute("aria-label", `${alarm.time} 알람 삭제`);

  item.append(time, deleteButton);

  return item;
}

function renderAlarms() {
  const fragment = document.createDocumentFragment();

  state.alarms.forEach((alarm) => {
    fragment.appendChild(createAlarmItem(alarm));
  });

  elements.alarmList.replaceChildren(fragment);
  elements.emptyMessage.hidden = state.alarms.length > 0;
  updateAlarmCount();
}

function normalizeInputValue(value, min, max) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < min || numberValue > max) {
    return null;
  }

  return numberValue;
}

function handleAlarmSubmit(event) {
  event.preventDefault();

  if (state.alarms.length >= MAX_ALARM_COUNT) {
    setStatus("알람은 최대 3개까지 등록할 수 있습니다.", "warning");
    return;
  }

  const formData = new FormData(elements.alarmForm);
  const hour = normalizeInputValue(formData.get("hour"), 0, 23);
  const minute = normalizeInputValue(formData.get("minute"), 0, 59);
  const second = normalizeInputValue(formData.get("second"), 0, 59);

  if (hour === null || minute === null || second === null) {
    setStatus("시/분/초 범위를 확인해 주세요. 시는 0~23, 분과 초는 0~59입니다.", "danger");
    return;
  }

  const time = formatTime({ hour, minute, second });
  const duplicatedAlarm = state.alarms.some((alarm) => alarm.time === time);

  if (duplicatedAlarm) {
    setStatus(`${time} 알람은 이미 등록되어 있습니다.`, "warning");
    return;
  }

  state.alarms.push({
    id: crypto.randomUUID(),
    time,
    lastTriggeredAt: "",
  });

  renderAlarms();
  elements.alarmForm.reset();
  setStatus(`${time} 알람이 추가되었습니다.`, "success");
}

function handleAlarmDelete(event) {
  const deleteButton = event.target.closest("[data-alarm-id]");

  if (!deleteButton) {
    return;
  }

  const deletedAlarm = state.alarms.find((alarm) => alarm.id === deleteButton.dataset.alarmId);
  state.alarms = state.alarms.filter((alarm) => alarm.id !== deleteButton.dataset.alarmId);

  renderAlarms();

  if (deletedAlarm) {
    setStatus(`${deletedAlarm.time} 알람을 삭제했습니다.`, "default");
  }
}

function checkAlarms() {
  if (state.battery === 0 || state.alarms.length === 0) {
    return;
  }

  const now = new Date();
  const todayKey = [
    now.getFullYear(),
    padTime(now.getMonth() + 1),
    padTime(now.getDate()),
  ].join("-");
  const currentTime = formatTime({
    hour: now.getHours(),
    minute: now.getMinutes(),
    second: now.getSeconds(),
  });

  state.alarms.forEach((alarm) => {
    const triggerKey = `${todayKey} ${currentTime}`;

    if (alarm.time === currentTime && alarm.lastTriggeredAt !== triggerKey) {
      alarm.lastTriggeredAt = triggerKey;
      setStatus(`${alarm.time} 알람 시간입니다.`, "success");
    }
  });
}

function drainBattery() {
  if (state.battery > 0) {
    state.battery -= 1;
  }

  updateBatteryView();

  if (state.battery === 0) {
    updateClockView();
    setStatus("배터리가 0%가 되어 시계 화면이 꺼졌습니다.", "danger");
  }
}

function chargeBattery() {
  state.battery = 100;
  updateBatteryView();
  updateClockView();
  setStatus("배터리를 100%로 충전했습니다.", "success");
}

function tick() {
  updateClockView();
  checkAlarms();
  drainBattery();
}

function init() {
  updateBatteryView();
  updateClockView();
  renderAlarms();

  elements.alarmForm.addEventListener("submit", handleAlarmSubmit);
  elements.alarmList.addEventListener("click", handleAlarmDelete);
  elements.chargeButton.addEventListener("click", chargeBattery);

  setInterval(tick, 1000);
}

init();
