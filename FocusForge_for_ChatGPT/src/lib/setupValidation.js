export function getSetupErrors({ primaryTask, secondaryTasks, additionalTasks, selectedHabits, customHabit, isIOSNative, iosSummary, selectedApps, iosPickerBusy }) {
  const tasks = []
  if (!primaryTask.trim()) tasks.push('Write your primary task.')
  secondaryTasks.forEach((task, index) => {
    if (!task.trim()) tasks.push(`Write secondary task ${index + 1}.`)
  })
  additionalTasks.forEach((task, index) => {
    if (!task.trim()) tasks.push(`Write additional task ${index + 1}, or remove its empty field.`)
  })
  const habits = []
  if (selectedHabits.length < 2) habits.push(`Choose or create at least 2 habits. You have ${selectedHabits.length} selected.`)
  if (customHabit.trim()) habits.push('Tap Add to save your custom habit, or clear its name.')
  const apps = []
  if (iosPickerBusy) apps.push('Please finish choosing your apps in Screen Time.')
  else if (isIOSNative ? !(iosSummary.applicationsCount || iosSummary.categoriesCount) : !selectedApps.length) apps.push('Choose at least one app or category to block.')
  return { 2: tasks, 3: habits, 4: apps }
}
