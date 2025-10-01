# 🏆 FPL Dashboard - Fantasy Premier League Analytics

A comprehensive Fantasy Premier League dashboard that provides detailed analytics, awards, and insights for your mini-league. Built with Python, Streamlit, and Google Sheets integration.

![FPL Dashboard](https://img.shields.io/badge/FPL-Dashboard-blue)
![Python](https://img.shields.io/badge/Python-3.11+-green)
![Streamlit](https://img.shields.io/badge/Streamlit-Web%20App-red)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### 📊 **League Analytics**
- **Classic League Standings** - Track overall performance
- **Head-to-Head League** - Monitor H2H matchups with complete match history
- **FPL Challenge Integration** - Special challenge tracking
- **Cup Status** - Knockout tournament progress

### 🏅 **Awards System**
The dashboard includes 15+ custom awards to make your mini-league more competitive:

#### **Performance Awards**
- **🎯 Golden Boot** - Top goal scorers
- **🎯 Playmaker** - Most assists
- **🛡️ Defensive King** - Best defensive contributions
- **⭐ Dream Team** - Perfect lineup selections

#### **Strategic Awards**
- **🔄 Transfer King** - Best transfer decisions
- **👑 Best Captain** - Captaincy decisions
- **👑 Best Vice-Captain** - Vice-captain performance
- **🎲 Penalty King** - Penalty point management

#### **Monthly Competitions**
- **📅 Classic Monthly** - Monthly classic league standings
- **📅 H2H Monthly** - Monthly head-to-head standings
- **📈 Shooting Stars** - Rank improvement tracking

#### **Special Awards**
- **💺 Bench King** - Bench player performance
- **🔄 Steady King** - Consistent performance
- **🎯 Best Underdog** - Surprise performers
- **⏰ Time Machine** - Historical rank tracking

### 📈 **Advanced Analytics**
- **Live Data Integration** - Real-time updates
- **Transfer Analysis** - In/out player performance
- **Chip Usage Tracking** - Wildcard, Free Hit, etc.
- **Historical Data** - Season-long tracking

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Google Cloud Platform account
- FPL league IDs

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/thinesrao/fpl-dashboard.git
cd fpl-dashboard
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure your league**
Edit `data_pipeline.py` and update these variables:
```python
CLASSIC_LEAGUE_ID = 665732        # Your classic league ID
H2H_LEAGUE_ID = 818813           # Your H2H league ID  
FPL_CHALLENGE_LEAGUE_ID = 5008   # Your FPL Challenge league ID
GOOGLE_SHEET_NAME = "FPL-Data-Pep"  # Your Google Sheet name
```

## ⚙️ Setup Guide

### 1. **Google Sheets Setup**

#### Create Google Service Account:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Sheets API and Google Drive API
4. Create Service Account credentials
5. Download the JSON key file

#### Set up Google Sheet:
1. Create a new Google Sheet
2. Name it according to `GOOGLE_SHEET_NAME`
3. Share the sheet with your service account email
4. The pipeline will automatically create required worksheets

### 2. **Environment Setup**

#### Local Development:
```bash
# Set up environment variables
export GCP_CREDENTIALS='{"type": "service_account", ...}'  # Your service account JSON

# Run the pipeline
python data_pipeline.py

# Run the dashboard
streamlit run app.py
```

#### GitHub Actions (Automated):
1. Go to your repository Settings → Secrets and variables → Actions
2. Add secret: `GCP_CREDENTIALS` with your service account JSON
3. The workflow will run automatically on schedule

### 3. **Deploy to Streamlit Cloud**

1. Go to [Streamlit Cloud](https://share.streamlit.io/)
2. Connect your GitHub repository
3. Add the `GCP_CREDENTIALS` secret in Streamlit Cloud settings
4. Deploy!

## 📁 Project Structure

```
fpl-dashboard/
├── app.py                 # Main Streamlit dashboard
├── data_pipeline.py       # Data fetching and processing
├── requirements.txt       # Python dependencies
├── .github/
│   └── workflows/
│       └── run_fpl_pipeline.yml  # Automated data pipeline
├── .streamlit/
│   └── config.toml       # Streamlit configuration
├── data/                 # Local data storage (optional)
└── README.md            # This file
```

## 🔧 Configuration Options

### Customizing Awards
You can modify the awards logic in `data_pipeline.py`:

```python
# Example: Custom penalty calculation
def calculate_custom_penalty(manager_data, gw):
    # Your custom logic here
    return penalty_score
```

### Adding New Awards
1. Add award logic in `data_pipeline.py`
2. Create corresponding worksheet in Google Sheets
3. Update `app.py` to display the new award

### Styling the Dashboard
Modify `app.py` to customize:
- Colors and themes
- Layout and components
- Additional visualizations

## 📊 Data Sources

- **FPL API**: Official Fantasy Premier League API
- **FPL Challenge API**: Special challenge data
- **Google Sheets**: Data storage and sharing
- **Live Data**: Real-time player and team updates

## 🛠️ Troubleshooting

### Common Issues:

**1. "League not found" error:**
- Verify your league IDs are correct
- Check if leagues are public or you have access

**2. "Google Sheets permission denied":**
- Ensure service account has edit access to the sheet
- Check the sheet name matches `GOOGLE_SHEET_NAME`

**3. "API rate limit exceeded":**
- The pipeline includes automatic retry logic
- Consider reducing update frequency

**4. "Missing player data":**
- Some players may have incomplete history
- The system handles this gracefully with default values

**5. "H2H monthly shows 0 vs 0":**
- This was a known issue with pagination
- Fixed in latest version - fetches all H2H matches

### Debug Mode:
```python
# Enable debug logging in data_pipeline.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Fantasy Premier League for the API
- Streamlit for the web framework
- Google Sheets for data storage
- The FPL community for inspiration

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section
2. Search existing issues
3. Create a new issue with detailed information

## 🔄 Recent Updates

### v2.1.0 - H2H Monthly Fix
- ✅ Fixed H2H monthly calculation showing all 0s
- ✅ Added pagination to fetch ALL H2H matches (532 matches)
- ✅ Improved match result calculations
- ✅ All 28 teams now have proper match data

### v2.0.0 - Major Features
- ✅ Added comprehensive awards system
- ✅ Integrated FPL Challenge support
- ✅ Added monthly competitions
- ✅ Improved data pipeline reliability

---

**Made with ❤️ for the FPL community**

*Transform your mini-league into a data-driven competition!*
