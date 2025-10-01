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

## 🚀 Usage

### Running the Pipeline
```bash
# Run the data pipeline
python data_pipeline.py

# Run the dashboard
streamlit run app.py
```

### Automated Updates
The pipeline runs automatically via GitHub Actions on a schedule to keep data fresh.

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

## 🔧 Configuration

The dashboard is configured through the `data_pipeline.py` file where you can:
- Modify award calculations
- Add new awards
- Customize data processing logic
- Update dashboard styling in `app.py`

## 📊 Data Sources

- **FPL API**: Official Fantasy Premier League API
- **FPL Challenge API**: Special challenge data
- **Google Sheets**: Data storage and sharing
- **Live Data**: Real-time player and team updates

## 🛠️ Troubleshooting

### Common Issues:
- **API rate limits**: The pipeline includes automatic retry logic
- **Missing data**: System handles incomplete data gracefully
- **H2H issues**: Fixed pagination to fetch all matches
- **Debug mode**: Enable logging in `data_pipeline.py` for troubleshooting

## 🔄 Development

This is a private repository for personal FPL league analytics.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Fantasy Premier League for the API
- Streamlit for the web framework
- Google Sheets for data storage
- The FPL community for inspiration

## 📞 Support

For issues or questions, check the troubleshooting section or review the code documentation.

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
