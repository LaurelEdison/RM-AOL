from botasaurus.browser import browser, Driver, Wait
import time
import random

@browser(headless=True)
def browse_articles(driver: Driver, data):
    index_url = "http://localhost:3000/index.php"
    
    # 1. Go to the index page
    driver.get(index_url)

    driver.enable_human_mode()
  # Wait for up to 4 seconds for the element to be present, return None if not found
    all_links = driver.select_all("a", wait=Wait.SHORT)  
    

    link = all_links[random.randint(1, 100)]
    time.sleep(1)
    link.click()
    driver.scroll_to_bottom()
    time.sleep(random.randint(1,10))
    home_linke = driver.select_all("a", wait=Wait.SHORT)
    home_link = home_linke[0]
    home_link.click()
    time.sleep(1)
    
        
for i in range(1500):
    print("Bot run {idx}".format(idx = i+1))
    browse_articles()
